/**
 * EarthquakeLayer — real-time earthquake data from USGS GeoJSON feed.
 *
 * Shows earthquakes from the past 24 hours, sized/colored by magnitude.
 * Phase 5: supports onSeek for historical ±24h window around target time.
 */
import type { Viewer } from "cesium";
import type {
    LayerPlugin,
    LayerCategory,
    LayerStatus,
    TimeAwareness,
} from "../../core/LayerPlugin.ts";

const USGS_URL =
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

const USGS_QUERY_BASE =
    "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=150";

export class EarthquakeLayer implements LayerPlugin {
    readonly id = "earthquakes";
    readonly label = "Earthquakes (24h)";
    readonly category: LayerCategory = "custom";
    readonly timeAware: TimeAwareness = "full";

    enabled = false;
    status: LayerStatus = "idle";
    entityCount?: number;
    lastRefresh?: number;

    private entityIds: string[] = [];

    async onAdd(viewer: Viewer): Promise<void> {
        await this.fetchAndRender(viewer, USGS_URL);
    }

    onRemove(viewer: Viewer): void {
        this.clearEntities(viewer);
    }

    async onSeek(viewer: Viewer, isoString: string): Promise<void> {
        const target = new Date(isoString);
        const msDay = 24 * 60 * 60 * 1000;
        const start = new Date(target.getTime() - msDay);
        const end = new Date(target.getTime() + msDay);

        const url = `${USGS_QUERY_BASE}&starttime=${start.toISOString()}&endtime=${end.toISOString()}`;
        this.clearEntities(viewer);
        await this.fetchAndRender(viewer, url);
    }

    private clearEntities(viewer: Viewer): void {
        for (const id of this.entityIds) {
            const entity = viewer.entities.getById(id);
            if (entity) viewer.entities.remove(entity);
        }
        this.entityIds = [];
    }

    private async fetchAndRender(viewer: Viewer, url: string): Promise<void> {
        const Cesium = await import("cesium");

        try {
            this.status = "loading";
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            const features = data.features.slice(0, 150);

            for (const feature of features) {
                const [lon, lat, depth] = feature.geometry.coordinates;
                const mag = feature.properties.mag || 0;
                const place = feature.properties.place || "Unknown";
                const id = `eq-${feature.id}`;

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
                        show: mag >= 4.0,
                    },
                    properties: {
                        isEarthquake: true,
                        mag,
                        place,
                        depth,
                        time: feature.properties.time,
                    },
                });

                this.entityIds.push(id);
            }

            this.entityCount = this.entityIds.length;
            this.lastRefresh = Date.now();
            this.status = "ready";
            console.log(`[EarthquakeLayer] Loaded ${features.length} earthquakes`);
        } catch (err) {
            console.error("[EarthquakeLayer] Failed:", err);
            this.status = "error";
            throw err;
        }
    }

    private magnitudeColor(
        Cesium: typeof import("cesium"),
        mag: number
    ): InstanceType<typeof Cesium.Color> {
        if (mag >= 6) return Cesium.Color.fromCssColorString("#ef4444");
        if (mag >= 5) return Cesium.Color.fromCssColorString("#f97316");
        if (mag >= 4) return Cesium.Color.fromCssColorString("#eab308");
        if (mag >= 3) return Cesium.Color.fromCssColorString("#22c55e");
        return Cesium.Color.fromCssColorString("#6366f1");
    }
}
