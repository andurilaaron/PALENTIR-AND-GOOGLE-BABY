import type { Viewer } from "cesium";
import type { LayerPlugin, LayerCategory, LayerStatus } from "../../core/LayerPlugin.ts";

export class NasaGibsLayer implements LayerPlugin {
    readonly id = "nasa-black-marble";
    readonly label = "NASA Black Marble";
    readonly category: LayerCategory = "tiles";
    readonly icon = "🌌";
    readonly source = "NASA EOSDIS GIBS";

    enabled = false;
    status: LayerStatus = "idle";

    private layerInstance: any = null;

    async onAdd(viewer: Viewer): Promise<void> {
        const Cesium = await import("cesium");

        try {
            this.status = "loading";

            // NASA GIBS Black Marble (Earth at Night)
            const provider = new Cesium.WebMapTileServiceImageryProvider({
                url: "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi",
                layer: "VIIRS_Black_Marble",
                style: "default",
                format: "image/png",
                tileMatrixSetID: "500m",
                maximumLevel: 8,
                tileWidth: 256,
                tileHeight: 256,
                tilingScheme: new Cesium.GeographicTilingScheme(),
                credit: "NASA EOSDIS GIBS"
            });

            this.layerInstance = viewer.imageryLayers.addImageryProvider(provider);
            this.status = "ready";

            console.log(`[NasaGibsLayer] ✅ Loaded NASA Black Marble imagery`);
        } catch (err) {
            console.error("[NasaGibsLayer] ❌ Failed to load NASA imagery:", err);
            this.status = "error";
            throw err;
        }
    }

    onRemove(viewer: Viewer): void {
        if (this.layerInstance) {
            viewer.imageryLayers.remove(this.layerInstance);
            this.layerInstance = null;
        }
        this.status = "idle";
        console.log("[NasaGibsLayer] 🔄 Removed");
    }
}
