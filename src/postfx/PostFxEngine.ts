/**
 * PostFxEngine — manages post-processing visual effects on the Cesium viewer.
 *
 * Modes: NORMAL, CRT, NVG (Night Vision), THERMAL
 * Uses Cesium PostProcessStage with custom GLSL fragment shaders.
 */
import type { Viewer, PostProcessStage } from "cesium";
import type { EffectMode } from "../core/AppState.ts";
import { AppState } from "../core/AppState.ts";

// Import shaders as raw strings
import crtShader from "./shaders/crt.glsl?raw";
import nvgShader from "./shaders/nvg.glsl?raw";
import thermalShader from "./shaders/thermal.glsl?raw";

export class PostFxEngine {
    private viewer: Viewer;
    private activeStage: PostProcessStage | null = null;
    private currentMode: EffectMode = "NORMAL";

    constructor(viewer: Viewer) {
        this.viewer = viewer;
    }

    getMode(): EffectMode {
        return this.currentMode;
    }

    async setMode(mode: EffectMode): Promise<void> {
        // Remove existing effect
        this.clearStage();

        this.currentMode = mode;

        if (mode === "NORMAL") {
            AppState.setState({ effects: { mode: "NORMAL" } });
            console.log("[PostFxEngine] Mode: NORMAL — all effects cleared");
            return;
        }

        const Cesium = await import("cesium");

        const shaderSource = this.getShaderForMode(mode);
        if (!shaderSource) return;

        this.activeStage = new Cesium.PostProcessStage({
            fragmentShader: shaderSource,
            uniforms: {
                u_time: () => performance.now() / 1000.0,
                u_resolution: () => new Cesium.Cartesian2(
                    this.viewer.canvas.width,
                    this.viewer.canvas.height
                ),
            },
        });

        this.viewer.scene.postProcessStages.add(this.activeStage);
        AppState.setState({ effects: { mode } });
        console.log(`[PostFxEngine] Mode: ${mode}`);
    }

    destroy(): void {
        this.clearStage();
    }

    private clearStage(): void {
        if (this.activeStage) {
            this.viewer.scene.postProcessStages.remove(this.activeStage);
            this.activeStage = null;
        }
    }

    private getShaderForMode(mode: EffectMode): string | null {
        switch (mode) {
            case "CRT":
                return crtShader;
            case "NVG":
                return nvgShader;
            case "THERMAL":
                return thermalShader;
            default:
                return null;
        }
    }
}

/** Factory function for integrator */
export function createPostFxEngine(viewer: Viewer): PostFxEngine {
    return new PostFxEngine(viewer);
}
