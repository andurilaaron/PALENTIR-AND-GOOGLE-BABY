/**
 * SatelliteLayer — real-time satellite tracking from CelesTrak TLE data.
 *
 * Data source: CelesTrak active satellites (JSON or 3LE format)
 * Updates positions on each Cesium clock tick via Keplerian propagation.
 */
import type { Viewer, JulianDate } from "cesium";
import type {
    LayerPlugin,
    LayerCategory,
    LayerStatus,
} from "../../core/LayerPlugin.ts";
import { parseTLE } from "./tleParser.ts";
import { extractElements, propagate } from "./propagator.ts";
import type { OrbitalElements } from "./propagator.ts";

/** CelesTrak active stations TLE URL */
const TLE_URL =
    "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle";

/** Max satellites to render for performance */
const MAX_SATELLITES = 50;

/** Update interval in ticks (~every 60 ticks = ~1 second at 60fps) */
const TICK_INTERVAL = 60;

export class SatelliteLayer implements LayerPlugin {
    readonly id = "satellites";
    readonly label = "Satellites (ISS+)";
    readonly category: LayerCategory = "satellite";
    readonly icon = "🛰️";
    readonly source = "CelesTrak";

    enabled = false;
    status: LayerStatus = "idle";
    entityCount?: number;
    lastRefresh?: number;

    private elements: OrbitalElements[] = [];
    private entityIds: string[] = [];
    private tickCount = 0;

    async onAdd(viewer: Viewer): Promise<void> {
        const Cesium = await import("cesium");

        try {
            // Fetch TLE data
            const response = await fetch(TLE_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const raw = await response.text();

            // Parse TLEs
            const records = parseTLE(raw).slice(0, MAX_SATELLITES);
            this.elements = records.map(extractElements);

            // Create initial entities
            const now = new Date();
            for (const el of this.elements) {
                const pos = propagate(el, now);
                const id = `sat-${el.name.replace(/\s+/g, "-")}`;

                viewer.entities.add({
                    id,
                    name: el.name,
                    position: Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.alt * 1000),
                    point: {
                        pixelSize: 4,
                        color: Cesium.Color.fromCssColorString("#5bf5a0"),
                        outlineColor: Cesium.Color.fromCssColorString("#5bf5a0").withAlpha(0.3),
                        outlineWidth: 2,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: {
                        text: el.name,
                        font: "10px system-ui",
                        fillColor: Cesium.Color.fromCssColorString("#aad4ff"),
                        style: Cesium.LabelStyle.FILL,
                        outlineWidth: 1,
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                        pixelOffset: new Cesium.Cartesian2(0, -8),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        show: false, // Only show on hover/zoom
                    },
                });

                this.entityIds.push(id);
            }

            this.entityCount = this.elements.length;
            this.lastRefresh = Date.now();

            console.log(
                `[SatelliteLayer] ✅ Loaded ${this.elements.length} satellites`
            );
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
        this.elements = [];
        this.tickCount = 0;
        console.log("[SatelliteLayer] 🔄 Removed");
    }

    onTick(viewer: Viewer, time: JulianDate): void {
        this.tickCount++;
        if (this.tickCount % TICK_INTERVAL !== 0) return;

        // Dynamic import to avoid top-level Cesium dependency
        const Cesium = (window as Record<string, unknown>)["Cesium"] as typeof import("cesium") | undefined;
        if (!Cesium) return;

        const jsDate = Cesium.JulianDate.toDate(time);

        for (let i = 0; i < this.elements.length; i++) {
            const el = this.elements[i];
            const pos = propagate(el, jsDate);
            const entity = viewer.entities.getById(this.entityIds[i]);
            if (entity) {
                (entity.position as unknown as { setValue: (v: unknown) => void }).setValue(
                    Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.alt * 1000)
                );
            }
        }
    }
}
