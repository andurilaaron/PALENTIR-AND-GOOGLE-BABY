/**
 * EarthquakeLayer — real-time earthquake data from USGS GeoJSON feed.
 *
 * Shows earthquakes from the past 24 hours, sized/colored by magnitude.
 */
import type { Viewer } from "cesium";
import type {
    LayerPlugin,
    LayerCategory,
    LayerStatus,
} from "../../core/LayerPlugin.ts";

const USGS_URL =
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

export class EarthquakeLayer implements LayerPlugin {
    readonly id = "earthquakes";
    readonly label = "Earthquakes (24h)";
    readonly category: LayerCategory = "custom";
    readonly icon = "🌋";
    readonly source = "USGS";

    enabled = false;
    status: LayerStatus = "idle";
    entityCount?: number;
    lastRefresh?: number;

    private entityIds: string[] = [];

    async onAdd(viewer: Viewer): Promise<void> {
        const Cesium = await import("cesium");

        try {
            const response = await fetch(USGS_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            const features = data.features.slice(0, 150); // Limit for performance

            for (const feature of features) {
                const [lon, lat, depth] = feature.geometry.coordinates;
                const mag = feature.properties.mag || 0;
                const place = feature.properties.place || "Unknown";
                const id = `eq-${feature.id}`;

                // Size and color based on magnitude
                const size = Math.max(4, mag * 3);
                const color = this.magnitudeColor(Cesium, mag);

                viewer.entities.add({
                    id,
                    name: `M${mag.toFixed(1)} — ${place}`,
                    position: Cesium.Cartesian3.fromDegrees(lon, lat, -depth * 1000),
                    point: {
                        pixelSize: size,
                        color,
                        outlineColor: color.withAlpha(0.4),
                        outlineWidth: 2,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: {
                        text: `M${mag.toFixed(1)}`,
                        font: "9px system-ui",
                        fillColor: Cesium.Color.WHITE.withAlpha(0.8),
                        style: Cesium.LabelStyle.FILL,
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                        pixelOffset: new Cesium.Cartesian2(0, -size - 2),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        show: mag >= 4.0, // Only show labels for M4+
                    },
                });

                this.entityIds.push(id);
            }

            this.entityCount = features.length;
            this.lastRefresh = Date.now();

            console.log(
                `[EarthquakeLayer] ✅ Loaded ${features.length} earthquakes`
            );
        } catch (err) {
            console.error("[EarthquakeLayer] ❌ Failed:", err);
            this.status = "error";
            throw err;
        }
    }

    onRemove(viewer: Viewer): void {
        for (const id of this.entityIds) {
            const entity = viewer.entities.getById(id);
            if (entity) viewer.entities.remove(entity);
        }
        this.entityIds = [];
        console.log("[EarthquakeLayer] 🔄 Removed");
    }

    private magnitudeColor(
        Cesium: typeof import("cesium"),
        mag: number
    ): InstanceType<typeof Cesium.Color> {
        if (mag >= 6) return Cesium.Color.fromCssColorString("#ef4444"); // Red
        if (mag >= 5) return Cesium.Color.fromCssColorString("#f97316"); // Orange
        if (mag >= 4) return Cesium.Color.fromCssColorString("#eab308"); // Yellow
        if (mag >= 3) return Cesium.Color.fromCssColorString("#22c55e"); // Green
        return Cesium.Color.fromCssColorString("#6366f1"); // Indigo for small
    }
}
