/**
 * useAppState — React hook for AppState singleton.
 *
 * Subscribes to AppState changes and triggers re-renders.
 * Agent 01 — Lane: src/core/**
 */
import { useEffect, useState } from "react";
import { AppState } from "./AppState.ts";
import type { AppStateShape } from "./AppState.ts";

export function useAppState(): AppStateShape {
    const [state, setState] = useState<AppStateShape>(() => AppState.getState() as AppStateShape);

    useEffect(() => {
        const unsubscribe = AppState.subscribe((next) => {
            setState({ ...next });
        });
        return unsubscribe;
    }, []);

    return state;
}
