/**
 * PostFxEngine — manages post-processing visual effects on the Cesium viewer.
 *
 * Modes: NORMAL, CRT, NVG, THERMAL, EDGE, RADAR, MOSAIC, BLUEPRINT
 * Uses Cesium PostProcessStage with custom GLSL fragment shaders.
 * Uniform closures poll AppState every frame — slider changes are instant.
 */
import type { Viewer, PostProcessStage } from "cesium";
import type { EffectMode } from "../core/AppState.ts";
import { AppState } from "../core/AppState.ts";
import { UNIFORM_DESCRIPTORS } from "./uniformDescriptors.ts";

// Import shaders as raw strings
import crtShader from "./shaders/crt.glsl?raw";
import nvgShader from "./shaders/nvg.glsl?raw";
import thermalShader from "./shaders/thermal.glsl?raw";
import edgeShader from "./shaders/edge.glsl?raw";
import radarShader from "./shaders/radar.glsl?raw";
import mosaicShader from "./shaders/mosaic.glsl?raw";
import blueprintShader from "./shaders/blueprint.glsl?raw";

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
            AppState.setState({ effects: { mode: "NORMAL" } as any });
            console.log("[PostFxEngine] Mode: NORMAL — all effects cleared");
            return;
        }

        const Cesium = await import("cesium");

        const shaderSource = this.getShaderForMode(mode);
        if (!shaderSource) return;

        const uniforms = this.buildUniforms(mode, Cesium);

        this.activeStage = new Cesium.PostProcessStage({
            fragmentShader: shaderSource,
            uniforms,
        });

        this.viewer.scene.postProcessStages.add(this.activeStage);
        AppState.setState({ effects: { mode } as any });
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

    /** Build per-frame closure uniforms that poll AppState for live slider values */
    private buildUniforms(mode: EffectMode, Cesium: typeof import("cesium")): Record<string, any> {
        const uniforms: Record<string, any> = {
            u_time: () => performance.now() / 1000.0,
            u_resolution: () => new Cesium.Cartesian2(
                this.viewer.canvas.width,
                this.viewer.canvas.height
            ),
        };

        const descriptors = UNIFORM_DESCRIPTORS[mode];
        if (descriptors) {
            for (const desc of descriptors) {
                const uniformName = desc.uniform;
                const defaultVal = desc.default;
                uniforms[uniformName] = () => {
                    const settings = AppState.getEffectSettings(mode);
                    return settings[uniformName] ?? defaultVal;
                };
            }
        }

        return uniforms;
    }

    private getShaderForMode(mode: EffectMode): string | null {
        switch (mode) {
            case "CRT":
                return crtShader;
            case "NVG":
                return nvgShader;
            case "THERMAL":
                return thermalShader;
            case "EDGE":
                return edgeShader;
            case "RADAR":
                return radarShader;
            case "MOSAIC":
                return mosaicShader;
            case "BLUEPRINT":
                return blueprintShader;
            default:
                return null;
        }
    }
}

/** Factory function for integrator */
export function createPostFxEngine(viewer: Viewer): PostFxEngine {
    return new PostFxEngine(viewer);
}
