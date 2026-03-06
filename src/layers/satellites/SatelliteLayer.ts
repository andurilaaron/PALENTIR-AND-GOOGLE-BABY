import type { Viewer, JulianDate } from "cesium";
import type {
    LayerPlugin,
    LayerCategory,
    LayerStatus,
    TimeAwareness,
} from "../../core/LayerPlugin.ts";
import { parseTLE } from "./tleParser.ts";
import { getSatellitePosition, generateOrbitPolyline } from "./propagator.ts";
import type { SatelliteRecord } from "./types.ts";

const TLE_URL =
    "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle";

const MAX_SATELLITES = 500; // Adjusted for a better visual mesh
const TICK_INTERVAL = 10; // Update ~6 times a second at 60fps

export class SatelliteLayer implements LayerPlugin {
    readonly id = "satellites";
    readonly label = "Active Satellites";
    readonly category: LayerCategory = "satellite";
    readonly icon = "🛰️";
    readonly source = "CelesTrak (NORAD)";
    readonly timeAware: TimeAwareness = "full";

    enabled = false;
    status: LayerStatus = "idle";
    entityCount?: number;
    lastRefresh?: number;

    private records: SatelliteRecord[] = [];
    private entityIds: string[] = [];
    private tickCount = 0;

    async onAdd(viewer: Viewer): Promise<void> {
        const Cesium = await import("cesium");

        this.status = "loading";
        try {
            const response = await fetch(TLE_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const raw = await response.text();

            const allRecords = parseTLE(raw);
            this.records = allRecords.slice(0, MAX_SATELLITES);

            const now = new Date();

            for (const record of this.records) {
                const pos = getSatellitePosition(record.satrec, now);
                if (!pos) continue; // Skip if initial propagation fails

                const id = `sat-${record.id}`;

                // Determine color based on orbit
                let colorHex = "#7ed4ff"; // Default LEO
                if (record.orbitCategory === "MEO") colorHex = "#ffaa00";
                if (record.orbitCategory === "GEO") colorHex = "#ff5555";

                const color = Cesium.Color.fromCssColorString(colorHex);

                viewer.entities.add({
                    id,
                    name: record.name,
                    position: pos,
                    point: {
                        pixelSize: 4,
                        color: color,
                        outlineColor: color.withAlpha(0.6),
                        outlineWidth: 2,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: {
                        text: record.name,
                        font: "10px ui-monospace, SFMono-Regular, monospace",
                        fillColor: Cesium.Color.WHITE,
                        style: Cesium.LabelStyle.FILL,
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                        pixelOffset: new Cesium.Cartesian2(0, -8),
                        showBackground: true,
                        backgroundColor: Cesium.Color.fromCssColorString("#0a101c").withAlpha(0.8),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 15000000), // Hide when zoomed out
                    },
                    polyline: {
                        show: new Cesium.CallbackProperty(() => viewer.selectedEntity?.id === id, false),
                        positions: generateOrbitPolyline(record.satrec, now),
                        width: 2,
                        material: color.withAlpha(0.5),
                        arcType: Cesium.ArcType.NONE
                    },
                    properties: {
                        isSatellite: true,
                        record: record
                    }
                });

                this.entityIds.push(id);
            }

            this.entityCount = this.entityIds.length;
            this.lastRefresh = Date.now();
            this.status = "ready";

            console.log(`[SatelliteLayer] ✅ Loaded ${this.entityIds.length} satellites`);
        } catch (err) {
            console.error("[SatelliteLayer] ❌ Failed to load TLE data:", err);
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
        this.records = [];
        this.tickCount = 0;
        this.status = "idle";
        console.log("[SatelliteLayer] 🔄 Removed");
    }

    onTick(viewer: Viewer, time: JulianDate): void {
        if (!this.enabled || this.records.length === 0) return;

        this.tickCount++;
        if (this.tickCount % TICK_INTERVAL !== 0) return;

        // Using dynamically available Cesium reference to avoid imports deep in the tick loop
        // @ts-ignore
        const Cesium = window.Cesium;
        if (!Cesium) return;

        const jsDate = Cesium.JulianDate.toDate(time);

        for (let i = 0; i < this.records.length; i++) {
            const record = this.records[i];
            const entityId = `sat-${record.id}`;
            const entity = viewer.entities.getById(entityId);

            if (entity) {
                const newPos = getSatellitePosition(record.satrec, jsDate);
                if (newPos) {
                    (entity.position as any).setValue(newPos);
                }
            }
        }
    }
}
