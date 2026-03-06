/**
 * TrafficLayer — placeholder heatmap layer for traffic data.
 *
 * In production, this would connect to a traffic API (Google, TomTom, HERE).
 * For now, renders sample traffic hotspots as visual demonstration.
 */
import type { Viewer } from "cesium";
import type {
    LayerPlugin,
    LayerCategory,
    LayerStatus,
} from "../../core/LayerPlugin.ts";

/** Sample traffic hotspots for demonstration */
const SAMPLE_HOTSPOTS = [
    { name: "LA Traffic", lon: -118.2437, lat: 34.0522, intensity: 0.9 },
    { name: "NYC Traffic", lon: -74.006, lat: 40.7128, intensity: 0.85 },
    { name: "London Traffic", lon: -0.1276, lat: 51.5074, intensity: 0.8 },
    { name: "Tokyo Traffic", lon: 139.6917, lat: 35.6895, intensity: 0.95 },
    { name: "Sydney Traffic", lon: 151.2093, lat: -33.8688, intensity: 0.7 },
    { name: "Mumbai Traffic", lon: 72.8777, lat: 19.076, intensity: 0.88 },
    { name: "São Paulo Traffic", lon: -46.6333, lat: -23.5505, intensity: 0.82 },
    { name: "Cairo Traffic", lon: 31.2357, lat: 30.0444, intensity: 0.75 },
    { name: "Beijing Traffic", lon: 116.4074, lat: 39.9042, intensity: 0.92 },
    { name: "Paris Traffic", lon: 2.3522, lat: 48.8566, intensity: 0.78 },
];

export class TrafficLayer implements LayerPlugin {
    readonly id = "traffic";
    readonly label = "Traffic Heatmap";
    readonly category: LayerCategory = "traffic";
    enabled = false;
    status: LayerStatus = "idle";

    private entityIds: string[] = [];

    async onAdd(viewer: Viewer): Promise<void> {
        const Cesium = await import("cesium");

        for (const hotspot of SAMPLE_HOTSPOTS) {
            const id = `traffic-${hotspot.name.replace(/\s+/g, "-")}`;

            // Outer glow (large, transparent)
            viewer.entities.add({
                id: `${id}-glow`,
                position: Cesium.Cartesian3.fromDegrees(hotspot.lon, hotspot.lat, 500),
                ellipse: {
                    semiMinorAxis: 30000 * hotspot.intensity,
                    semiMajorAxis: 30000 * hotspot.intensity,
                    material: Cesium.Color.fromCssColorString("#ef4444").withAlpha(
                        0.15 * hotspot.intensity
                    ),
                    height: 500,
                },
            });

            // Inner core
            viewer.entities.add({
                id,
                name: hotspot.name,
                position: Cesium.Cartesian3.fromDegrees(hotspot.lon, hotspot.lat, 1000),
                point: {
                    pixelSize: 8 + hotspot.intensity * 8,
                    color: Cesium.Color.fromCssColorString("#ef4444").withAlpha(
                        0.5 + hotspot.intensity * 0.4
                    ),
                    outlineColor: Cesium.Color.fromCssColorString("#fca5a5").withAlpha(0.3),
                    outlineWidth: 3,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                },
                label: {
                    text: hotspot.name,
                    font: "9px system-ui",
                    fillColor: Cesium.Color.fromCssColorString("#fca5a5"),
                    style: Cesium.LabelStyle.FILL,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -14),
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    show: false,
                },
            });

            this.entityIds.push(id, `${id}-glow`);
        }

        console.log(
            `[TrafficLayer] ✅ Loaded ${SAMPLE_HOTSPOTS.length} traffic hotspots (demo data)`
        );
    }

    onRemove(viewer: Viewer): void {
        for (const id of this.entityIds) {
            const entity = viewer.entities.getById(id);
            if (entity) viewer.entities.remove(entity);
        }
        this.entityIds = [];
        console.log("[TrafficLayer] 🔄 Removed");
    }
}
