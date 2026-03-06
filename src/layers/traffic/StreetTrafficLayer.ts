/**
 * StreetTrafficLayer — real-time road traffic flow overlay.
 *
 * Uses TomTom Traffic Flow tile service (no API key required for basic flow tiles).
 * Tiles are color-coded: green = free flow, yellow = slow, red = congested.
 * Only visible when zoomed in below ~1000km altitude.
 */
import type { Viewer } from "cesium";
import type { LayerPlugin, LayerCategory, LayerStatus } from "../../core/LayerPlugin.ts";

export class StreetTrafficLayer implements LayerPlugin {
    readonly id = "street-traffic";
    readonly label = "Street Traffic";
    readonly category: LayerCategory = "traffic";
    readonly icon = "🚦";
    readonly source = "TomTom Flow";

    enabled = false;
    status: LayerStatus = "idle";

    private imageryLayer: any = null;

    async onAdd(viewer: Viewer): Promise<void> {
        const Cesium = await import("cesium");
        this.status = "loading";

        try {
            // TomTom traffic flow tiles — publicly accessible, no key required for basic usage.
            // Style 7 = absolute flow with colours (green→yellow→red).
            // Zoom levels 0–22, 256px tiles.
            const provider = new Cesium.UrlTemplateImageryProvider({
                url: "https://api.tomtom.com/traffic/map/4/tile/flow/absolute/{z}/{x}/{y}.png?tileSize=256&style=7&key=",
                credit: "TomTom Traffic",
                minimumLevel: 4,
                maximumLevel: 18,
            });

            this.imageryLayer = viewer.scene.imageryLayers.addImageryProvider(provider);
            this.imageryLayer.alpha = 0.80;

            this.status = "ready";
            console.log("[StreetTrafficLayer] ✅ Traffic flow tiles loaded");
        } catch (e) {
            // Fallback: use OpenStreetMap transport layer as approximate traffic context
            console.warn("[StreetTrafficLayer] ⚠️ TomTom failed, falling back to OSM transport", e);
            await this.loadFallback(viewer);
        }
    }

    private async loadFallback(viewer: Viewer): Promise<void> {
        const Cesium = await import("cesium");
        try {
            const provider = new Cesium.UrlTemplateImageryProvider({
                url: "https://tile.thunderforest.com/transport/{z}/{x}/{y}.png",
                credit: "Thunderforest Transport",
                minimumLevel: 4,
                maximumLevel: 18,
            });
            this.imageryLayer = viewer.scene.imageryLayers.addImageryProvider(provider);
            this.imageryLayer.alpha = 0.70;
            this.status = "ready";
        } catch (fe) {
            this.status = "error";
            console.error("[StreetTrafficLayer] ❌ Fallback also failed", fe);
        }
    }

    onRemove(viewer: Viewer): void {
        if (this.imageryLayer) {
            viewer.scene.imageryLayers.remove(this.imageryLayer);
            this.imageryLayer = null;
        }
        this.status = "idle";
        console.log("[StreetTrafficLayer] 🔄 Removed");
    }
}
