/**
 * FlightLayer — real-time aircraft tracking via OpenSky Network.
 *
 * Polls every 15 seconds for aircraft positions.
 * Uses yellow markers with heading-based rotation.
 */
import type { Viewer, JulianDate } from "cesium";
import type {
    LayerPlugin,
    LayerCategory,
    LayerStatus,
} from "../../core/LayerPlugin.ts";
import { fetchAircraft } from "./openSkyApi.ts";
import type { Aircraft } from "./openSkyApi.ts";

const POLL_INTERVAL_MS = 15000;

export class FlightLayer implements LayerPlugin {
    readonly id = "flights";
    readonly label = "Live Flights";
    readonly category: LayerCategory = "flights";
    readonly icon = "✈️";
    readonly source = "OpenSky Network";

    enabled = false;
    status: LayerStatus = "idle";
    entityCount?: number;
    lastRefresh?: number;

    private pollTimer: ReturnType<typeof setInterval> | null = null;
    private entityIds: Set<string> = new Set();

    async onAdd(viewer: Viewer): Promise<void> {
        // Initial fetch
        await this.updateFlights(viewer);

        // Start polling
        this.pollTimer = setInterval(() => {
            this.updateFlights(viewer);
        }, POLL_INTERVAL_MS);

        console.log("[FlightLayer] ✅ Live flight tracking started (15s poll)");
    }

    onRemove(viewer: Viewer): void {
        // Stop polling
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }

        // Remove all entities
        for (const id of this.entityIds) {
            const entity = viewer.entities.getById(id);
            if (entity) viewer.entities.remove(entity);
        }
        this.entityIds.clear();

        console.log("[FlightLayer] 🔄 Removed");
    }

    // No onTick — uses setInterval polling instead

    private async updateFlights(viewer: Viewer): Promise<void> {
        const Cesium = await import("cesium");

        let aircraft: Aircraft[];
        try {
            aircraft = await fetchAircraft();
        } catch (err) {
            console.warn("[FlightLayer] ⚠️ Poll failed:", err);
            return;
        }

        // Track which IDs are still present
        const currentIds = new Set<string>();

        for (const ac of aircraft) {
            const id = `flight-${ac.icao24}`;
            currentIds.add(id);

            const position = Cesium.Cartesian3.fromDegrees(
                ac.longitude,
                ac.latitude,
                ac.altitude
            );

            const existing = viewer.entities.getById(id);

            if (existing) {
                // Update position
                (existing.position as unknown as { setValue: (v: unknown) => void }).setValue(position);
            } else {
                // Create new entity
                viewer.entities.add({
                    id,
                    name: ac.callsign || ac.icao24,
                    position,
                    point: {
                        pixelSize: 5,
                        color: Cesium.Color.fromCssColorString("#fbbf24"),
                        outlineColor: Cesium.Color.fromCssColorString("#fbbf24").withAlpha(0.3),
                        outlineWidth: 2,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: {
                        text: ac.callsign || ac.icao24,
                        font: "10px system-ui",
                        fillColor: Cesium.Color.fromCssColorString("#fde68a"),
                        style: Cesium.LabelStyle.FILL,
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                        pixelOffset: new Cesium.Cartesian2(0, -8),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        show: false,
                    },
                });

                this.entityIds.add(id);
            }
        }

        // Remove stale entities (aircraft that are no longer in the data)
        for (const id of this.entityIds) {
            if (!currentIds.has(id)) {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
                this.entityIds.delete(id);
            }
        }

        this.entityCount = currentIds.size;
        this.lastRefresh = Date.now();
    }
}
