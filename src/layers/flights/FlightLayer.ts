import type { Viewer, JulianDate } from "cesium";
import type {
    LayerPlugin,
    LayerCategory,
    LayerStatus,
    TimeAwareness,
} from "../../core/LayerPlugin.ts";
import { fetchAircraft } from "./adsbApi.ts";
import type { Aircraft } from "./adsbApi.ts";

const POLL_INTERVAL_MS = 15000; // 15s — OpenSky allows this comfortably
const BACKOFF_INTERVALS = [30000, 60000]; // max 60s backoff — don't stay stuck

interface FlightState {
    ac: Aircraft;
    lastUpdate: number;
}

export class FlightLayer implements LayerPlugin {
    readonly id = "flights";
    readonly label = "Live Flights";
    readonly category: LayerCategory = "flights";
    readonly icon = "✈️";
    readonly source = "airplanes.live";
    readonly timeAware: TimeAwareness = "snapshot";

    enabled = false;
    status: LayerStatus = "idle";
    entityCount?: number;
    lastRefresh?: number;

    // Cached Cesium module — loaded once in onAdd, reused in onTick (fixes window.Cesium bug)
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
        // Cache Cesium so onTick can use it without window global
        this.CesiumRef = await import("cesium");
        await this.updateFlights(viewer);
        this.schedulePoll(viewer);
        console.log("[FlightLayer] ✅ Live flight tracking started");
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
        // Collect IDs first to avoid Set mutation during iteration
        const toRemove = [...this.entityIds];
        for (const id of toRemove) {
            const entity = viewer.entities.getById(id);
            if (entity) viewer.entities.remove(entity);
        }
        this.entityIds.clear();
        this.stateMap.clear();
        this.CesiumRef = null;
        console.log("[FlightLayer] 🔄 Removed");
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

            // Update state so the next tick dead-reckons from here, not from the original poll
            state.ac.longitude += dLon;
            state.ac.latitude += dLat;
            state.lastUpdate = now;
        }
    }

    private getAltitudeColor(altitude: number): string {
        if (altitude < 3000) return "#4ade80";
        if (altitude < 9000) return "#fbbf24";
        return "#60a5fa";
    }

    private async updateFlights(viewer: Viewer): Promise<void> {
        const Cesium = this.CesiumRef!;

        // Always query by point (the /all endpoint is aggressively rate-limited).
        // Raycast from canvas center to find where the camera is actually looking.
        // At high altitude the Pick may miss — fall back to camera nadir.
        let centerLat = 0;
        let centerLon = 0;

        try {
            const canvas = viewer.scene.canvas;
            const ray = viewer.camera.getPickRay(
                new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2)
            );
            const hit = ray ? viewer.scene.globe.pick(ray, viewer.scene) : undefined;

            if (hit) {
                const c = Cesium.Ellipsoid.WGS84.cartesianToCartographic(hit);
                centerLat = Cesium.Math.toDegrees(c.latitude);
                centerLon = Cesium.Math.toDegrees(c.longitude);
            } else {
                // Horizon/space view — use the nadir directly below camera
                const cam = viewer.camera.positionCartographic;
                centerLat = Cesium.Math.toDegrees(cam.latitude);
                centerLon = Cesium.Math.toDegrees(cam.longitude);
            }
        } catch (_e) {
            // Last resort — camera nadir even if cartographic conversion fails
            try {
                const cam = viewer.camera.positionCartographic;
                centerLat = Cesium.Math.toDegrees(cam.latitude);
                centerLon = Cesium.Math.toDegrees(cam.longitude);
            } catch { return; }
        }

        // Always request maximum 250nm so we get a dense result wherever we're looking
        const altKm = viewer.camera.positionCartographic.height / 1000;
        const radiusNm = altKm > 8000 ? 250 : Math.min(250, Math.max(80, altKm * 0.06));

        console.log(`[FlightLayer] 📡 Fetching flights: ${centerLat.toFixed(2)}°, ${centerLon.toFixed(2)}° r=${Math.round(radiusNm)}nm`);

        let aircraft: Aircraft[];
        try {
            aircraft = await fetchAircraft(centerLat, centerLon, radiusNm);
            this.backoffLevel = 0;
        } catch (err: any) {
            if (err?.message?.includes("429")) {
                this.backoffLevel = Math.min(this.backoffLevel + 1, BACKOFF_INTERVALS.length);
                const wait = BACKOFF_INTERVALS[this.backoffLevel - 1] / 1000;
                console.warn(`[FlightLayer] 🚫 Rate limited (429) — backing off ${wait}s`);
            } else {
                console.warn("[FlightLayer] ⚠️ Poll failed:", err);
            }
            return;
        }

        console.log(`[FlightLayer] ✈️ Got ${aircraft.length} aircraft`);
        const currentIds = new Set<string>();
        const now = Date.now();

        for (const ac of aircraft) {
            const id = `flight-${ac.icao24}`;
            currentIds.add(id);
            this.stateMap.set(id, { ac, lastUpdate: now });

            const position = Cesium.Cartesian3.fromDegrees(ac.longitude, ac.latitude, ac.altitude);
            const color = this.getAltitudeColor(ac.altitude);
            const rotation = -Cesium.Math.toRadians(ac.heading);

            const existing = viewer.entities.getById(id);
            if (existing) {
                (existing.position as any).setValue(position);
                // Use consistent raw number (not ConstantProperty) — fixes type inconsistency
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
                        backgroundColor: Cesium.Color.fromCssColorString("#0a101c").withAlpha(0.8),
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                        pixelOffset: new Cesium.Cartesian2(0, -16),
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1500000),
                    },
                    properties: { isFlight: true, record: ac }
                });
                this.entityIds.add(id);
            }
        }

        // Collect stale IDs before removing to avoid Set mutation during iteration
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
