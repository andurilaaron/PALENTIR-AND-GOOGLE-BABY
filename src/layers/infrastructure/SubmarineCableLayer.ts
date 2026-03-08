/**
 * SubmarineCableLayer — renders undersea telecommunications cables as polylines.
 *
 * Data source: TeleGeography (static snapshot in server/data/submarine-cables.json).
 * Each cable is drawn as a cyan polyline with a name label at the midpoint.
 */
import type { Viewer } from "cesium";
import type {
    LayerPlugin,
    LayerCategory,
    LayerStatus,
} from "../../core/LayerPlugin.ts";

interface SubmarineCable {
    name: string;
    capacity: string;
    length: string;
    rfs: string;
    points: [number, number][];
}

export class SubmarineCableLayer implements LayerPlugin {
    readonly id = "submarine-cables";
    readonly label = "Submarine Cables";
    readonly category: LayerCategory = "custom";
    readonly icon = "🔌";
    readonly source = "TeleGeography";

    enabled = false;
    status: LayerStatus = "idle";
    entityCount = 0;

    private entityIds: string[] = [];

    async onAdd(viewer: Viewer): Promise<void> {
        this.status = "loading";

        const Cesium = await import("cesium");

        let cables: SubmarineCable[] = [];
        try {
            const res = await fetch("/api/data/submarine-cables");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            cables = await res.json();
        } catch (err) {
            console.error("[SubmarineCableLayer] Failed to fetch data:", err);
            this.status = "error";
            return;
        }

        const cableColor = Cesium.Color.fromCssColorString("#22d3ee").withAlpha(0.5);
        const labelColor = Cesium.Color.fromCssColorString("#22d3ee");
        const labelBgColor = Cesium.Color.fromCssColorString("#0a101c").withAlpha(0.75);

        for (const cable of cables) {
            if (!cable.points || cable.points.length < 2) continue;

            // Build flat [lon, lat, alt, lon, lat, alt, ...] array for Cesium
            const positions = Cesium.Cartesian3.fromDegreesArrayHeights(
                cable.points.flatMap(([lon, lat]) => [lon, lat, 0])
            );

            // Midpoint for the label
            const midIndex = Math.floor(cable.points.length / 2);
            const [midLon, midLat] = cable.points[midIndex];

            const polylineId = `cable-line-${cable.name}`;
            const labelId = `cable-label-${cable.name}`;

            // Polyline entity
            viewer.entities.add({
                id: polylineId,
                name: cable.name,
                polyline: {
                    positions,
                    width: 2,
                    material: cableColor,
                    clampToGround: false,
                },
                properties: {
                    isCable: true,
                    name: cable.name,
                    capacity: cable.capacity,
                    length: cable.length,
                    rfs: cable.rfs,
                },
            });
            this.entityIds.push(polylineId);

            // Label entity at midpoint
            viewer.entities.add({
                id: labelId,
                name: `${cable.name} (label)`,
                position: Cesium.Cartesian3.fromDegrees(midLon, midLat, 100),
                label: {
                    text: cable.name,
                    font: "11px monospace",
                    fillColor: labelColor,
                    backgroundColor: labelBgColor,
                    showBackground: true,
                    backgroundPadding: new Cesium.Cartesian2(5, 3),
                    style: Cesium.LabelStyle.FILL,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                    pixelOffset: new Cesium.Cartesian2(0, -4),
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    // Only show at moderate zoom (below ~8 million metres camera altitude)
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8_000_000),
                },
            });
            this.entityIds.push(labelId);
        }

        this.entityCount = cables.length;
        this.status = "ready";
        console.log(`[SubmarineCableLayer] Loaded ${cables.length} cables`);
    }

    onRemove(viewer: Viewer): void {
        for (const id of this.entityIds) {
            const entity = viewer.entities.getById(id);
            if (entity) viewer.entities.remove(entity);
        }
        this.entityIds = [];
        this.entityCount = 0;
        this.status = "idle";
        console.log("[SubmarineCableLayer] Removed");
    }
}
