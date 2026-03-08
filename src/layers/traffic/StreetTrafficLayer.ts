/**
 * StreetTrafficLayer — dark street map overlay using CartoDB Dark Matter tiles.
 *
 * Provides a clean, high-contrast road network overlay that complements the
 * dark Cesium globe theme. CartoDB tiles are free and require no API key.
 *
 * Tile source: CartoDB Dark Matter (© OpenStreetMap contributors, © CARTO)
 * Alpha: 0.5 so the underlying Cesium imagery remains visible beneath.
 */
import type { Viewer } from "cesium";
import type { LayerPlugin, LayerCategory, LayerStatus } from "../../core/LayerPlugin.ts";

export class StreetTrafficLayer implements LayerPlugin {
    readonly id = "street-traffic";
    readonly label = "Street Traffic";
    readonly category: LayerCategory = "traffic";
    readonly source = "CartoDB Dark Matter";

    enabled = false;
    status: LayerStatus = "idle";

    private imageryLayer: any = null;

    async onAdd(viewer: Viewer): Promise<void> {
        const Cesium = await import("cesium");
        this.status = "loading";

        try {
            const provider = new Cesium.UrlTemplateImageryProvider({
                url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                subdomains: "abcd",
                credit: "© OpenStreetMap contributors, © CARTO",
                minimumLevel: 4,
                maximumLevel: 18,
            });

            this.imageryLayer = viewer.scene.imageryLayers.addImageryProvider(provider);
            this.imageryLayer.alpha = 0.5;

            this.status = "ready";
            console.log("[StreetTrafficLayer] Street overlay loaded (CartoDB Dark Matter tiles)");
        } catch (e) {
            this.status = "error";
            console.error("[StreetTrafficLayer] Failed to load street tiles", e);
        }
    }

    onRemove(viewer: Viewer): void {
        if (this.imageryLayer) {
            viewer.scene.imageryLayers.remove(this.imageryLayer);
            this.imageryLayer = null;
        }
        this.status = "idle";
        console.log("[StreetTrafficLayer] Removed");
    }
}
