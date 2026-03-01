/**
 * AppState — minimal typed state container (no external libs).
 *
 * Provides global app state with subscribe/notify pattern.
 */

export type EffectMode = "NORMAL" | "CRT" | "NVG" | "THERMAL";

export interface AppStateShape {
    ui: {
        isLayersOpen: boolean;
    };
    layers: Record<string, boolean>;
    effects: {
        mode: EffectMode;
    };
}

export type StateListener = (state: AppStateShape) => void;

const initialState: AppStateShape = {
    ui: {
        isLayersOpen: true,
    },
    layers: {},
    effects: {
        mode: "NORMAL",
    },
};

class _AppState {
    private state: AppStateShape = structuredClone(initialState);
    private listeners: Set<StateListener> = new Set();

    getState(): Readonly<AppStateShape> {
        return this.state;
    }

    setState(partial: Partial<AppStateShape>): void {
        this.state = {
            ...this.state,
            ...partial,
            ui: { ...this.state.ui, ...(partial.ui ?? {}) },
            effects: { ...this.state.effects, ...(partial.effects ?? {}) },
            layers: { ...this.state.layers, ...(partial.layers ?? {}) },
        };
        this.notify();
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
