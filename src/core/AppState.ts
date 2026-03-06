/**
 * AppState — minimal typed state container (no external libs).
 *
 * Provides global app state with subscribe/notify pattern.
 */

export type EffectMode = "NORMAL" | "CRT" | "NVG" | "THERMAL" | "EDGE" | "RADAR" | "MOSAIC" | "BLUEPRINT";

export interface PlaybackState {
    isPlaying: boolean;
    multiplier: number;
    mode: "live" | "historical";
    startIso: string | null;
    stopIso: string | null;
    currentIso: string;
}

export interface AppStateShape {
    ui: {
        isLayersOpen: boolean;
    };
    layers: Record<string, boolean>;
    effects: {
        mode: EffectMode;
        settings: Partial<Record<EffectMode, Record<string, number>>>;
    };
    playback: PlaybackState;
}

export type StateListener = (state: AppStateShape) => void;

const initialState: AppStateShape = {
    ui: {
        isLayersOpen: false,
    },
    layers: {},
    effects: {
        mode: "NORMAL",
        settings: {},
    },
    playback: {
        isPlaying: true,
        multiplier: 1,
        mode: "live",
        startIso: null,
        stopIso: null,
        currentIso: new Date().toISOString(),
    },
};

class _AppState {
    private state: AppStateShape = structuredClone(initialState);
    private listeners: Set<StateListener> = new Set();

    getState(): Readonly<AppStateShape> {
        return this.state;
    }

    setState(partial: Partial<AppStateShape>): void {
        // Deep-merge effects.settings per-mode
        const prevSettings = this.state.effects.settings;
        const incomingEffects = partial.effects ?? {};
        const incomingSettings = (incomingEffects as any).settings;
        let mergedSettings = prevSettings;
        if (incomingSettings) {
            mergedSettings = { ...prevSettings };
            for (const mode of Object.keys(incomingSettings) as EffectMode[]) {
                mergedSettings[mode] = {
                    ...(prevSettings[mode] ?? {}),
                    ...incomingSettings[mode],
                };
            }
        }

        this.state = {
            ...this.state,
            ...partial,
            ui: { ...this.state.ui, ...(partial.ui ?? {}) },
            effects: {
                ...this.state.effects,
                ...(partial.effects ?? {}),
                settings: mergedSettings,
            },
            layers: { ...this.state.layers, ...(partial.layers ?? {}) },
            playback: { ...this.state.playback, ...(partial.playback ?? {}) },
        };
        this.notify();
    }

    /** Set a single uniform value for a specific effect mode */
    setUniform(mode: EffectMode, name: string, value: number): void {
        this.setState({
            effects: {
                settings: {
                    [mode]: { [name]: value },
                },
            } as any,
        });
    }

    /** Get all current settings for a mode (returns empty object if none set) */
    getEffectSettings(mode: EffectMode): Record<string, number> {
        return this.state.effects.settings[mode] ?? {};
    }

    subscribe(listener: StateListener): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notify(): void {
        for (const listener of this.listeners) {
            listener(this.state);
        }
    }
}

/** Singleton instance */
export const AppState = new _AppState();
