/**
 * TrafficLayer — road network overlay using OpenStreetMap raster tiles.
 *
 * Renders a real road network at reduced opacity over the Cesium globe, giving
 * genuine geographic road context without requiring any API key.
 *
 * Tile source: OpenStreetMap (© OpenStreetMap contributors, ODbL)
 * Alpha: 0.4 so the underlying Cesium imagery remains visible beneath.
 */
import type { Viewer } from "cesium";
import type {
    LayerPlugin,
    LayerCategory,
    LayerStatus,
} from "../../core/LayerPlugin.ts";

export class TrafficLayer implements LayerPlugin {
    readonly id = "traffic";
    readonly label = "Road Network";
    readonly category: LayerCategory = "traffic";
    enabled = false;
    status: LayerStatus = "idle";

    private imageryLayer: any = null;

    async onAdd(viewer: Viewer): Promise<void> {
        const Cesium = await import("cesium");
        this.status = "loading";

        try {
            const provider = new Cesium.UrlTemplateImageryProvider({
                url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                subdomains: "abc",
                credit: "© OpenStreetMap contributors",
                minimumLevel: 6,
                maximumLevel: 18,
            });

            this.imageryLayer = viewer.scene.imageryLayers.addImageryProvider(provider);
            this.imageryLayer.alpha = 0.4;

            this.status = "ready";
            console.log("[TrafficLayer] Road network overlay loaded (OpenStreetMap tiles)");
        } catch (e) {
            this.status = "error";
            console.error("[TrafficLayer] Failed to load road network tiles", e);
        }
    }

    onRemove(viewer: Viewer): void {
        if (this.imageryLayer) {
            viewer.scene.imageryLayers.remove(this.imageryLayer);
            this.imageryLayer = null;
        }
        this.status = "idle";
        console.log("[TrafficLayer] Removed");
    }
}
