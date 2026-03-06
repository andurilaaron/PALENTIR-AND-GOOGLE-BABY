import type { Viewer } from "cesium";
import type { LayerPlugin, LayerCategory, LayerStatus } from "../../core/LayerPlugin.ts";

export class WeatherRadarLayer implements LayerPlugin {
    readonly id = "weather-radar";
    readonly label = "Weather Radar";
    readonly category: LayerCategory = "custom";
    readonly icon = "⛈️";
    readonly source = "NOAA / RainViewer";

    enabled = false;
    status: LayerStatus = "idle";

    private imageryProvider: any = null;
    private imageryLayer: any = null;

    async onAdd(viewer: Viewer): Promise<void> {
        const Cesium = await import("cesium");
        this.status = "loading";

        try {
            // Fetch latest real-time Rainviewer radar map metadata
            const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
            const data = await res.json();

            // Get the most recent timestamp available
            const latest = data.radar.past[data.radar.past.length - 1];
            const path = latest.path;

            // Generate an XYZ tile provider directly pulling from the Rainviewer CDN
            this.imageryProvider = new Cesium.UrlTemplateImageryProvider({
                url: `${data.host}${path}/256/{z}/{x}/{y}/2/1_1.png`,
                credit: 'RainViewer',
                minimumLevel: 0,
                maximumLevel: 10
            });

            this.imageryLayer = viewer.scene.imageryLayers.addImageryProvider(this.imageryProvider);
            // Put it above base maps but below labels
            viewer.scene.imageryLayers.raiseToTop(this.imageryLayer);

            // Add a massive global opacity to let the base map shine through
            this.imageryLayer.alpha = 0.65;

            this.status = "ready";
            console.log(`[WeatherRadarLayer] ✅ Loaded global radar map from ${new Date(latest.time * 1000).toLocaleTimeString()}`);
        } catch (e) {
            console.error("[WeatherRadarLayer] ❌ Failed to mount Rainviewer data.", e);
            this.status = "error";
            throw e;
        }
    }

    onRemove(viewer: Viewer): void {
        if (this.imageryLayer) {
            viewer.scene.imageryLayers.remove(this.imageryLayer);
            this.imageryLayer = null;
            this.imageryProvider = null;
        }
        this.status = "idle";
        console.log("[WeatherRadarLayer] 🔄 Removed");
    }
}
