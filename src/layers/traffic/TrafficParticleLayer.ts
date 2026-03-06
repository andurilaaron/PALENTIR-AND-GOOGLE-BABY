import type { Viewer, JulianDate } from "cesium";
import type {
    LayerPlugin,
    LayerCategory,
    LayerStatus,
} from "../../core/LayerPlugin.ts";
import { loadMajorRoads } from "./trafficRoadLoader.ts";
import { TrafficParticleSystem } from "./trafficParticleSystem.ts";

/** Altitude thresholds (metres) for tick-rate throttling */
const CITY_ALT = 50_000;       // below → every frame
const GLOBAL_ALT = 5_000_000;  // above → every 6th frame

export class TrafficParticleLayer implements LayerPlugin {
    readonly id = "traffic-particles";
    readonly label = "Traffic Flow";
    readonly category: LayerCategory = "traffic";
    readonly icon = "🚗";
    readonly source = "Natural Earth";

    enabled = false;
    status: LayerStatus = "idle";
    entityCount?: number;
    lastRefresh?: number;

    private CesiumRef: typeof import("cesium") | null = null;
    private particles: TrafficParticleSystem | null = null;
    private lastTickMs = 0;
    private frameCounter = 0;

    async onAdd(viewer: Viewer): Promise<void> {
        console.log("[TrafficParticleLayer] onAdd called");
        this.CesiumRef = await import("cesium");
        console.log("[TrafficParticleLayer] Cesium loaded");

        const rawRoads = await loadMajorRoads();
        console.log("[TrafficParticleLayer] Roads loaded:", rawRoads.length);

        const system = new TrafficParticleSystem();
        system.initialize(viewer, this.CesiumRef, rawRoads);
        console.log("[TrafficParticleLayer] Particles initialized");

        this.particles = system;
        this.lastTickMs = performance.now();
        this.frameCounter = 0;
        this.entityCount = 30_000;
        this.lastRefresh = Date.now();
        this.status = "ready";

        console.log("[TrafficParticleLayer] Ready");
    }

    onRemove(viewer: Viewer): void {
        if (this.particles) {
            this.particles.destroy(viewer);
            this.particles = null;
        }
        this.CesiumRef = null;
        this.entityCount = 0;
        this.status = "idle";
        console.log("[TrafficParticleLayer] Removed");
    }

    onTick(viewer: Viewer, _time: JulianDate): void {
        if (!this.enabled || !this.particles || !this.CesiumRef) return;

        /* ---------- altitude-based throttle ---------- */
        const altMetres = viewer.camera.positionCartographic.height;
        this.frameCounter++;

        if (altMetres > GLOBAL_ALT) {
            // Global zoom — only update every 6th frame
            if (this.frameCounter % 6 !== 0) return;
        } else if (altMetres > CITY_ALT) {
            // Mid zoom — every 3rd frame
            if (this.frameCounter % 3 !== 0) return;
        }
        // City zoom — every frame (no skip)

        /* ---------- wall-clock delta ---------- */
        const now = performance.now();
        let deltaSec = (now - this.lastTickMs) / 1000;
        this.lastTickMs = now;

        // Clamp to avoid huge jumps after tab-away or lag spikes
        if (deltaSec > 0.1) deltaSec = 0.1;

        this.particles.tick(viewer, this.CesiumRef, deltaSec);
    }
}
