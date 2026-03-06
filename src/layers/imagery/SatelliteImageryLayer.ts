/**
 * SatelliteImageryLayer — high-resolution overhead satellite imagery.
 *
 * Uses ArcGIS World Imagery (~0.3-0.5m resolution in urban areas).
 * Free, no API key required.
 *
 * Note: This layer adds imagery on top of the default Cesium globe.
 * Disable Google 3D Tiles first for a flat overhead analysis view.
 */
import type { Viewer } from "cesium";
import type {
    LayerPlugin,
    LayerCategory,
    LayerStatus,
} from "../../core/LayerPlugin.ts";

const ARCGIS_WORLD_IMAGERY_URL =
    "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";

export class SatelliteImageryLayer implements LayerPlugin {
    readonly id = "satellite-imagery";
    readonly label = "Hi-Res Imagery";
    readonly category: LayerCategory = "tiles";
    readonly icon = "🛰️";
    readonly source = "ArcGIS / Maxar / Airbus";

    enabled = false;
    status: LayerStatus = "idle";

    private imageryLayer: any = null;

    async onAdd(viewer: Viewer): Promise<void> {
        const Cesium = await import("cesium");
        this.status = "loading";

        try {
            const provider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
                ARCGIS_WORLD_IMAGERY_URL,
                {
                    enablePickFeatures: false,
                }
            );

            this.imageryLayer =
                viewer.scene.imageryLayers.addImageryProvider(provider);
            this.imageryLayer.alpha = 1.0;
            viewer.scene.imageryLayers.raiseToTop(this.imageryLayer);

            this.status = "ready";
            console.log("[SatelliteImageryLayer] Loaded ArcGIS World Imagery");
        } catch (err) {
            console.error("[SatelliteImageryLayer] Failed:", err);
            this.status = "error";
            throw err;
        }
    }

    onRemove(viewer: Viewer): void {
        if (this.imageryLayer) {
            viewer.scene.imageryLayers.remove(this.imageryLayer);
            this.imageryLayer = null;
        }
        this.status = "idle";
    }
}
