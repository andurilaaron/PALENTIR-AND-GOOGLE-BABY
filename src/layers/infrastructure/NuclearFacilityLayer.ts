/**
 * NuclearFacilityLayer — renders nuclear facilities as point entities.
 *
 * Data source: IAEA PRIS (static snapshot in server/data/nuclear-facilities.json).
 * Each facility is shown as an amber point with a pulsing outline ring and a label.
 */
import type { Viewer } from "cesium";
import type {
    LayerPlugin,
    LayerCategory,
    LayerStatus,
} from "../../core/LayerPlugin.ts";

interface NuclearFacility {
    name: string;
    country: string;
    type: string;
    capacity: string;
    status: string;
    lat: number;
    lon: number;
}

export class NuclearFacilityLayer implements LayerPlugin {
    readonly id = "nuclear-facilities";
    readonly label = "Nuclear Facilities";
    readonly category: LayerCategory = "custom";
    readonly icon = "☢️";
    readonly source = "IAEA PRIS";

    enabled = false;
    status: LayerStatus = "idle";
    entityCount = 0;

    private entityIds: string[] = [];

    async onAdd(viewer: Viewer): Promise<void> {
        this.status = "loading";

        const Cesium = await import("cesium");

        let facilities: NuclearFacility[] = [];
        try {
            const res = await fetch("/api/data/nuclear-facilities");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            facilities = await res.json();
        } catch (err) {
            console.error("[NuclearFacilityLayer] Failed to fetch data:", err);
            this.status = "error";
            return;
        }

        const pointColor = Cesium.Color.fromCssColorString("#f59e0b");
        const outlineColor = Cesium.Color.fromCssColorString("#f59e0b").withAlpha(0.3);
        const labelFill = Cesium.Color.fromCssColorString("#fde68a");
        const labelBg = Cesium.Color.fromCssColorString("#0a101c").withAlpha(0.8);

        for (const facility of facilities) {
            const id = `nuclear-${facility.name.replace(/\s+/g, "-")}`;

            viewer.entities.add({
                id,
                name: facility.name,
                position: Cesium.Cartesian3.fromDegrees(facility.lon, facility.lat, 50),
                point: {
                    pixelSize: 10,
                    color: pointColor,
                    outlineColor,
                    outlineWidth: 8,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                },
                label: {
                    text: `☢ ${facility.name}`,
                    font: "11px monospace",
                    fillColor: labelFill,
                    backgroundColor: labelBg,
                    showBackground: true,
                    backgroundPadding: new Cesium.Cartesian2(6, 4),
                    style: Cesium.LabelStyle.FILL,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                    pixelOffset: new Cesium.Cartesian2(0, -16),
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    // Only show below 5 million metres camera altitude
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5_000_000),
                },
                properties: {
                    isNuclear: true,
                    name: facility.name,
                    country: facility.country,
                    type: facility.type,
                    capacity: facility.capacity,
                    status: facility.status,
                },
            });

            this.entityIds.push(id);
        }

        this.entityCount = facilities.length;
        this.status = "ready";
        console.log(`[NuclearFacilityLayer] Loaded ${facilities.length} facilities`);
    }

    onRemove(viewer: Viewer): void {
        for (const id of this.entityIds) {
            const entity = viewer.entities.getById(id);
            if (entity) viewer.entities.remove(entity);
        }
        this.entityIds = [];
        this.entityCount = 0;
        this.status = "idle";
        console.log("[NuclearFacilityLayer] Removed");
    }
}
