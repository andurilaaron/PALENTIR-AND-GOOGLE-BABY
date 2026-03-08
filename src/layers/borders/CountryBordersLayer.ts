/**
 * CountryBordersLayer — renders country border outlines as a tile overlay.
 *
 * Uses ArcGIS World Boundaries and Places tile service.
 * Tile-based approach loads incrementally and has zero entity overhead.
 */
import type { Viewer, JulianDate, ImageryLayer } from "cesium";
import type {
    LayerPlugin,
    LayerCategory,
    LayerStatus,
} from "../../core/LayerPlugin.ts";

const BORDERS_URL =
    "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer";

export class CountryBordersLayer implements LayerPlugin {
    readonly id = "country-borders";
    readonly label = "Country Borders";
    readonly category: LayerCategory = "custom";
    readonly icon = "\uD83C\uDF10";
    readonly source = "ArcGIS Reference";

    enabled = false;
    status: LayerStatus = "idle";
    entityCount?: number;
    lastRefresh?: number;

    private imageryLayer: ImageryLayer | null = null;

    async onAdd(viewer: Viewer): Promise<void> {
        const Cesium = await import("cesium");

        this.status = "loading";

        try {
            const provider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
                BORDERS_URL
            );

            this.imageryLayer = viewer.imageryLayers.addImageryProvider(provider);
            this.imageryLayer.alpha = 0.7;

            this.lastRefresh = Date.now();
            this.status = "ready";

            console.log("[CountryBordersLayer] Loaded border tiles");
        } catch (err) {
            console.error("[CountryBordersLayer] Failed to load:", err);
            this.status = "error";
            throw err;
        }
    }

    onRemove(viewer: Viewer): void {
        if (this.imageryLayer) {
            viewer.imageryLayers.remove(this.imageryLayer, true);
            this.imageryLayer = null;
        }
        this.lastRefresh = undefined;
        this.status = "idle";
        console.log("[CountryBordersLayer] Removed");
    }

    onTick(_viewer: Viewer, _time: JulianDate): void {
        // Tile layer — no per-tick updates needed
    }
}
