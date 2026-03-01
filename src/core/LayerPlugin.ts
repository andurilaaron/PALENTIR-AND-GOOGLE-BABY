/**
 * LayerPlugin — contract for all data-layer plugins.
 *
 * Every layer (satellites, flights, tiles, CCTV, etc.) implements this
 * interface so the registry can manage lifecycle uniformly.
 */
import type { Viewer, JulianDate } from "cesium";

export type LayerCategory =
    | "tiles"
    | "satellite"
    | "flights"
    | "cctv"
    | "earthquakes"
    | "traffic"
    | "effects"
    | "custom";

export type LayerStatus = "idle" | "loading" | "ready" | "error";

export interface LayerPlugin {
    /** Unique identifier */
    readonly id: string;

    /** Human-readable label for the UI */
    readonly label: string;

    /** Category for grouping in the layer panel */
    readonly category: LayerCategory;

    /** Whether the layer is currently enabled */
    enabled: boolean;

    /** Current lifecycle status */
    status: LayerStatus;

    /**
     * Called when the layer is toggled ON.
     * Add entities/primitives/data-sources to the viewer here.
     */
    onAdd(viewer: Viewer): void | Promise<void>;

    /**
     * Called when the layer is toggled OFF.
     * Clean up all entities/primitives/data-sources here.
     */
    onRemove(viewer: Viewer): void;

    /**
     * Optional — called on every Cesium clock tick while the layer is enabled.
     * Use for real-time position updates, animations, etc.
     */
    onTick?(viewer: Viewer, time: JulianDate): void;
}
