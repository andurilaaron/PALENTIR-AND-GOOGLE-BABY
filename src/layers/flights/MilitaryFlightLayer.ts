import type { Viewer, JulianDate } from "cesium";
import type {
    LayerPlugin,
    LayerCategory,
    LayerStatus,
} from "../../core/LayerPlugin.ts";
import { fetchMilitaryAircraft } from "./adsbApi.ts";
import type { Aircraft } from "./adsbApi.ts";

const POLL_INTERVAL_MS = 60000;
const STARTUP_DELAY_MS = 8000;
const BACKOFF_INTERVALS = [60000, 120000, 300000];

interface FlightState {
    ac: Aircraft;
    lastUpdate: number;
}

export class MilitaryFlightLayer implements LayerPlugin {
    readonly id = "military-flights";
    readonly label = "Military Flights";
    readonly category: LayerCategory = "flights";
    readonly icon = "🎖️";
    readonly source = "airplanes.live";

    enabled = false;
    status: LayerStatus = "idle";
    entityCount?: number;
    lastRefresh?: number;

    // Cached Cesium — loaded once in onAdd, reused in onTick
    private CesiumRef: typeof import("cesium") | null = null;
    private pollTimer: ReturnType<typeof setTimeout> | null = null;
    private stateMap = new Map<string, FlightState>();
    private entityIds: Set<string> = new Set();
    private backoffLevel = 0;

    private getAirplaneIcon(color: string): string {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
          <path fill="${color}" stroke="#000" stroke-width="0.5" d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>`;
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }

    async onAdd(viewer: Viewer): Promise<void> {
        this.CesiumRef = await import("cesium");
        // Staggered startup — 8s after civilian FlightLayer
        setTimeout(async () => {
            if (!this.enabled) return; // user may have already toggled off
            await this.updateFlights(viewer);
            this.schedulePoll(viewer);
        }, STARTUP_DELAY_MS);
        console.log(`[MilitaryFlightLayer] ✅ Will start in ${STARTUP_DELAY_MS / 1000}s`);
    }

    private schedulePoll(viewer: Viewer): void {
        if (this.pollTimer) clearTimeout(this.pollTimer);
        const interval = this.backoffLevel > 0
            ? BACKOFF_INTERVALS[Math.min(this.backoffLevel - 1, BACKOFF_INTERVALS.length - 1)]
            : POLL_INTERVAL_MS;
        this.pollTimer = setTimeout(async () => {
            await this.updateFlights(viewer);
            this.schedulePoll(viewer);
        }, interval);
    }

    onRemove(viewer: Viewer): void {
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = null;
        }
        const toRemove = [...this.entityIds];
        for (const id of toRemove) {
            const entity = viewer.entities.getById(id);
            if (entity) viewer.entities.remove(entity);
        }
        this.entityIds.clear();
        this.stateMap.clear();
        this.CesiumRef = null;
        console.log("[MilitaryFlightLayer] 🔄 Removed");
    }

    onTick(viewer: Viewer, _time: JulianDate): void {
        if (!this.enabled || !this.CesiumRef) return;

        const Cesium = this.CesiumRef;
        const now = Date.now();

        for (const [id, state] of this.stateMap.entries()) {
            const entity = viewer.entities.getById(id);
            if (!entity) continue;

            const dt = (now - state.lastUpdate) / 1000.0;
            const headingRad = state.ac.heading * (Math.PI / 180);
            const dy = state.ac.velocity * dt * Math.cos(headingRad);
            const dx = state.ac.velocity * dt * Math.sin(headingRad);
            const dLat = dy / 111111.0;
            const dLon = dx / (111111.0 * Math.cos(state.ac.latitude * (Math.PI / 180)));

            const newPos = Cesium.Cartesian3.fromDegrees(
                state.ac.longitude + dLon,
                state.ac.latitude + dLat,
                state.ac.altitude
            );
            (entity.position as any).setValue(newPos);
        }
    }

    private async updateFlights(viewer: Viewer): Promise<void> {
        const Cesium = this.CesiumRef!;

        let aircraft: Aircraft[];
        try {
            aircraft = await fetchMilitaryAircraft();
            this.backoffLevel = 0;
        } catch (err: any) {
            if (err?.message?.includes("429")) {
                this.backoffLevel = Math.min(this.backoffLevel + 1, BACKOFF_INTERVALS.length);
                const wait = BACKOFF_INTERVALS[this.backoffLevel - 1] / 1000;
                console.warn(`[MilitaryFlightLayer] 🚫 Rate limited — backing off ${wait}s`);
            } else {
                console.warn("[MilitaryFlightLayer] ⚠️ Poll failed:", err);
            }
            return;
        }

        console.log(`[MilitaryFlightLayer] 🎖️ Got ${aircraft.length} military aircraft`);
        const currentIds = new Set<string>();
        const now = Date.now();
        const color = "#ef4444";

        for (const ac of aircraft) {
            const id = `mil-flight-${ac.icao24}`;
            currentIds.add(id);
            this.stateMap.set(id, { ac, lastUpdate: now });

            const position = Cesium.Cartesian3.fromDegrees(ac.longitude, ac.latitude, ac.altitude);
            const rotation = -Cesium.Math.toRadians(ac.heading);

            const existing = viewer.entities.getById(id);
            if (existing) {
                (existing.position as any).setValue(position);
                if (existing.billboard) (existing.billboard.rotation as any) = rotation;
                existing.properties!.record = ac;
            } else {
                viewer.entities.add({
                    id,
                    name: ac.callsign || ac.icao24,
                    position,
                    billboard: {
                        image: this.getAirplaneIcon(color),
                        width: 24,
                        height: 24,
                        rotation,
                        alignedAxis: Cesium.Cartesian3.UNIT_Z,
                    },
                    label: {
                        text: ac.callsign || ac.icao24,
                        font: "10px ui-monospace, monospace",
                        fillColor: Cesium.Color.fromCssColorString(color),
                        style: Cesium.LabelStyle.FILL,
                        showBackground: true,
                        backgroundColor: Cesium.Color.fromCssColorString("#3f0000").withAlpha(0.8),
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                        pixelOffset: new Cesium.Cartesian2(0, -16),
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3000000),
                    },
                    properties: { isFlight: true, record: ac }
                });
                this.entityIds.add(id);
            }
        }

        const staleIds = [...this.entityIds].filter(id => !currentIds.has(id));
        for (const id of staleIds) {
            const entity = viewer.entities.getById(id);
            if (entity) viewer.entities.remove(entity);
            this.entityIds.delete(id);
            this.stateMap.delete(id);
        }

        this.entityCount = this.entityIds.size;
        this.lastRefresh = now;
    }
}
