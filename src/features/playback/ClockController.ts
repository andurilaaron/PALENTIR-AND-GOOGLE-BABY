/**
 * ClockController — singleton that owns all viewer.clock mutations.
 *
 * Keeps clock logic out of React components. Syncs clock state to AppState
 * and dispatches onSeek to time-aware layers via LayerRegistry.
 */
import type { Viewer, Event } from "cesium";
import { AppState } from "../../core/AppState.ts";
import { LayerRegistry } from "../../core/LayerRegistry.ts";

class _ClockController {
    private viewer: Viewer | null = null;
    private CesiumRef: typeof import("cesium") | null = null;
    private tickRemover: Event.RemoveCallback | null = null;

    async attach(viewer: Viewer): Promise<void> {
        this.viewer = viewer;
        this.CesiumRef = await import("cesium");

        // Sync AppState.playback.currentIso from clock every tick
        this.tickRemover = viewer.clock.onTick.addEventListener((clock) => {
            if (!this.CesiumRef) return;
            const iso = this.CesiumRef.JulianDate.toIso8601(clock.currentTime);
            // Direct state mutation to avoid notify storms — only update currentIso
            const state = AppState.getState();
            if (state.playback.currentIso !== iso) {
                (state as any).playback.currentIso = iso;
                // Lightweight notify — skip full setState to reduce overhead
                AppState.setState({ playback: { currentIso: iso } as any });
            }
        });

        console.log("[ClockController] Attached");
    }

    detach(): void {
        if (this.tickRemover) {
            this.tickRemover();
            this.tickRemover = null;
        }
        this.viewer = null;
        this.CesiumRef = null;
        console.log("[ClockController] Detached");
    }

    play(): void {
        if (!this.viewer) return;
        this.viewer.clock.shouldAnimate = true;
        AppState.setState({ playback: { isPlaying: true } as any });
    }

    pause(): void {
        if (!this.viewer) return;
        this.viewer.clock.shouldAnimate = false;
        AppState.setState({ playback: { isPlaying: false, mode: "historical" } as any });
    }

    setMultiplier(x: number): void {
        if (!this.viewer) return;
        this.viewer.clock.multiplier = x;
        AppState.setState({ playback: { multiplier: x } as any });
    }

    seekTo(isoString: string): void {
        if (!this.viewer || !this.CesiumRef) return;
        const Cesium = this.CesiumRef;

        this.viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(isoString);
        AppState.setState({ playback: { currentIso: isoString, mode: "historical" } as any });

        // Dispatch onSeek to eligible layers
        const layers = LayerRegistry.getAll();
        for (const plugin of layers) {
            if (plugin.enabled && plugin.onSeek) {
                plugin.onSeek(this.viewer, isoString);
            }
        }
    }

    setRange(startIso: string, stopIso: string): void {
        if (!this.viewer || !this.CesiumRef) return;
        const Cesium = this.CesiumRef;

        this.viewer.clock.startTime = Cesium.JulianDate.fromIso8601(startIso);
        this.viewer.clock.stopTime = Cesium.JulianDate.fromIso8601(stopIso);
        this.viewer.clock.clockRange = Cesium.ClockRange.CLAMPED;
        AppState.setState({ playback: { startIso, stopIso } as any });
    }

    clearRange(): void {
        if (!this.viewer || !this.CesiumRef) return;
        const Cesium = this.CesiumRef;

        this.viewer.clock.clockRange = Cesium.ClockRange.UNBOUNDED;
        AppState.setState({ playback: { startIso: null, stopIso: null } as any });
    }

    goLive(): void {
        if (!this.viewer || !this.CesiumRef) return;
        const Cesium = this.CesiumRef;
        const now = Cesium.JulianDate.now();

        this.viewer.clock.currentTime = now;
        this.viewer.clock.shouldAnimate = true;
        this.viewer.clock.multiplier = 1;
        this.viewer.clock.clockRange = Cesium.ClockRange.UNBOUNDED;

        AppState.setState({
            playback: {
                isPlaying: true,
                multiplier: 1,
                mode: "live",
                startIso: null,
                stopIso: null,
                currentIso: Cesium.JulianDate.toIso8601(now),
            },
        });
    }
}

export const ClockController = new _ClockController();
