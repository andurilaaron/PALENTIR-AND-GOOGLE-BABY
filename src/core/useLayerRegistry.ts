/**
 * useLayerRegistry — React hook for reactive access to the LayerRegistry.
 *
 * Returns a snapshot of all registered layers that updates whenever
 * the registry changes (register, enable, disable, etc.).
 */
import { useCallback, useEffect, useState } from "react";
import { LayerRegistry } from "./LayerRegistry.ts";
import type { LayerPlugin } from "./LayerPlugin.ts";

export function useLayerRegistry(): {
    layers: LayerPlugin[];
    toggle: (id: string) => void;
} {
    const [layers, setLayers] = useState<LayerPlugin[]>(() =>
        LayerRegistry.getAll()
    );

    useEffect(() => {
        const unsubscribe = LayerRegistry.subscribe(() => {
            // Create a new snapshot so React picks up changes
            setLayers([...LayerRegistry.getAll()]);
        });
        return unsubscribe;
    }, []);

    const toggle = useCallback((id: string) => {
        LayerRegistry.toggleLayer(id);
    }, []);

    return { layers, toggle };
}
