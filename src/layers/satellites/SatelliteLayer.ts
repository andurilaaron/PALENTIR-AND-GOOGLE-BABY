/**
 * SatelliteLayer — live TLE tracking + CZML playback for historical scrubbing.
 *
 * Live mode:  Fetches TLEs from CelesTrak, propagates per-tick via satellite.js.
 * CZML mode:  On onSeek(), pre-computes a ±2h window, loads as CzmlDataSource
 *             with Lagrange interpolation and orbit trail paths. Cesium handles
 *             all timeline scrubbing natively.
 *
 * Switches back to live mode when ClockController.goLive() is called.
 */
import type { Viewer, JulianDate } from "cesium";
import type {
    LayerPlugin,
    LayerCategory,
    LayerStatus,
    TimeAwareness,
} from "../../core/LayerPlugin.ts";
import { AppState } from "../../core/AppState.ts";
import { parseTLE } from "./tleParser.ts";
import { getSatellitePosition, generateOrbitPolyline } from "./propagator.ts";
import { generateSatelliteCZML } from "./czmlGenerator.ts";
import type { SatelliteRecord } from "./types.ts";

const TLE_URL =
    "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle";

const MAX_SATELLITES = 500;
const TICK_INTERVAL = 10;
const CZML_WINDOW_HOURS = 2; // ±2h around seek target

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

    // CZML playback state
    private czmlMode = false;
    private czmlSource: any = null; // CzmlDataSource

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
                if (!pos) continue;

                const id = `sat-${record.id}`;

                let colorHex = "#7ed4ff";
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
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 15000000),
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

            console.log(`[SatelliteLayer] Loaded ${this.entityIds.length} satellites`);
        } catch (err) {
            console.error("[SatelliteLayer] Failed to load TLE data:", err);
            this.status = "error";
            throw err;
        }
    }

    onRemove(viewer: Viewer): void {
        this.exitCzmlMode(viewer);

        for (const id of this.entityIds) {
            const entity = viewer.entities.getById(id);
            if (entity) viewer.entities.remove(entity);
        }
        this.entityIds = [];
        this.records = [];
        this.tickCount = 0;
        this.status = "idle";
        console.log("[SatelliteLayer] Removed");
    }

    async onSeek(viewer: Viewer, isoString: string): Promise<void> {
        if (this.records.length === 0) return;

        const Cesium = await import("cesium");
        const target = new Date(isoString);
        const windowMs = CZML_WINDOW_HOURS * 60 * 60 * 1000;
        const start = new Date(target.getTime() - windowMs);
        const end = new Date(target.getTime() + windowMs);

        // Remove existing CZML source
        if (this.czmlSource) {
            viewer.dataSources.remove(this.czmlSource, true);
            this.czmlSource = null;
        }

        // Hide tick-based entities
        for (const id of this.entityIds) {
            const entity = viewer.entities.getById(id);
            if (entity) entity.show = false;
        }

        this.status = "loading";

        try {
            const czml = generateSatelliteCZML(this.records, start, end);
            this.czmlSource = await Cesium.CzmlDataSource.load(czml);
            viewer.dataSources.add(this.czmlSource);

            this.czmlMode = true;
            this.entityCount = this.czmlSource.entities.values.length;
            this.lastRefresh = Date.now();
            this.status = "ready";

            console.log(
                `[SatelliteLayer] CZML playback: ${this.entityCount} sats, ` +
                `${start.toISOString()} → ${end.toISOString()}`
            );
        } catch (err) {
            console.error("[SatelliteLayer] CZML generation failed:", err);
            this.status = "error";
            // Restore tick entities on failure
            for (const id of this.entityIds) {
                const entity = viewer.entities.getById(id);
                if (entity) entity.show = true;
            }
        }
    }

    onTick(viewer: Viewer, time: JulianDate): void {
        if (!this.enabled || this.records.length === 0) return;

        // Auto-exit CZML mode when returning to live
        if (this.czmlMode) {
            const mode = AppState.getState().playback.mode;
            if (mode === "live") {
                this.exitCzmlMode(viewer);
            }
            return; // CZML handles positions — skip tick propagation
        }

        this.tickCount++;
        if (this.tickCount % TICK_INTERVAL !== 0) return;

        // @ts-ignore — Cesium global from dynamic import
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

    /** Exit CZML playback — remove data source, restore tick entities */
    private exitCzmlMode(viewer: Viewer): void {
        if (!this.czmlMode) return;

        if (this.czmlSource) {
            viewer.dataSources.remove(this.czmlSource, true);
            this.czmlSource = null;
        }

        // Restore tick-based entities
        for (const id of this.entityIds) {
            const entity = viewer.entities.getById(id);
            if (entity) entity.show = true;
        }

        this.czmlMode = false;
        this.entityCount = this.entityIds.length;
        console.log("[SatelliteLayer] Exited CZML mode — back to live tick");
    }
}
