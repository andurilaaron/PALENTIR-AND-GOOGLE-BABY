/**
 * trafficParticleSystem — manages ~30 000 amber particles flowing along
 * pre-loaded road geometry using a single PointPrimitiveCollection.
 *
 * All mutable per-particle state lives in typed arrays to avoid GC pressure.
 */

import type { Viewer } from "cesium";
import type { RawRoadLine } from "./trafficRoadLoader.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ParticleConfig {
    /** Total number of particles to distribute across all roads */
    count: number;
    /** Base speed in road-parameter units per second (0–1 range per road) */
    baseSpeed: number;
    /** Random speed variance (±) */
    speedVariance: number;
}

/** Internal — a road converted to Cartesian3 with arc-length LUT */
interface RoadSegment {
    /** Flat Cartesian3 buffer: [x0,y0,z0, x1,y1,z1, …] */
    positions: Float64Array;
    /** Cumulative arc lengths from vertex 0; length = vertexCount */
    cumLengths: Float64Array;
    /** Total arc length of this road */
    totalLength: number;
    /** Number of vertices */
    vertexCount: number;
}

/* ------------------------------------------------------------------ */
/*  Default config                                                     */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG: ParticleConfig = {
    count: 30_000,
    baseSpeed: 0.012,
    speedVariance: 0.005,
};

/* ------------------------------------------------------------------ */
/*  TrafficParticleSystem                                              */
/* ------------------------------------------------------------------ */

export class TrafficParticleSystem {
    private roads: RoadSegment[] = [];
    private collection: any = null; // PointPrimitiveCollection
    private CesiumRef: typeof import("cesium") | null = null;

    /* Per-particle typed arrays */
    private tParams: Float32Array | null = null;   // 0..1 position along road
    private speeds: Float32Array | null = null;    // road-param units / sec
    private roadIdx: Int32Array | null = null;     // index into this.roads

    /* Scratch Cartesian3 — reused every tick to avoid allocation */
    private scratch: any = null; // Cesium.Cartesian3

    private particleCount = 0;

    /* ---------------------------------------------------------------- */
    /*  Public API                                                       */
    /* ---------------------------------------------------------------- */

    initialize(
        viewer: Viewer,
        Cesium: typeof import("cesium"),
        rawRoads: RawRoadLine[],
        config: Partial<ParticleConfig> = {},
    ): void {
        const cfg = { ...DEFAULT_CONFIG, ...config };
        this.CesiumRef = Cesium;
        this.scratch = new Cesium.Cartesian3();

        /* ---------- convert raw roads to Cartesian + arc lengths -------- */
        this.roads = rawRoads.map((raw) => buildSegment(raw, Cesium));

        /* ---------- distribute particles weighted by length ------------- */
        const totalLen = this.roads.reduce((s, r) => s + r.totalLength, 0);
        if (totalLen === 0) return;

        this.particleCount = cfg.count;
        this.tParams = new Float32Array(cfg.count);
        this.speeds = new Float32Array(cfg.count);
        this.roadIdx = new Int32Array(cfg.count);

        let pi = 0; // particle index
        for (let ri = 0; ri < this.roads.length && pi < cfg.count; ri++) {
            const share = Math.max(1, Math.round((this.roads[ri].totalLength / totalLen) * cfg.count));
            for (let j = 0; j < share && pi < cfg.count; j++, pi++) {
                this.tParams[pi] = Math.random();
                this.speeds[pi] = cfg.baseSpeed + (Math.random() * 2 - 1) * cfg.speedVariance;
                this.roadIdx[pi] = ri;
            }
        }
        // Fill any remainder into the last road
        const lastRoad = this.roads.length - 1;
        while (pi < cfg.count) {
            this.tParams[pi] = Math.random();
            this.speeds[pi] = cfg.baseSpeed + (Math.random() * 2 - 1) * cfg.speedVariance;
            this.roadIdx[pi] = lastRoad;
            pi++;
        }

        /* ---------- create PointPrimitiveCollection --------------------- */
        this.collection = new Cesium.PointPrimitiveCollection();

        const amber = Cesium.Color.fromCssColorString("#ffb347").withAlpha(0.9);
        const glow = Cesium.Color.fromCssColorString("#ffe0a0").withAlpha(0.3);

        for (let i = 0; i < cfg.count; i++) {
            const pos = this.interpolatePosition(i);
            this.collection.add({
                position: pos,
                pixelSize: 4,
                color: amber,
                outlineColor: glow,
                outlineWidth: 2,
                scaleByDistance: new Cesium.NearFarScalar(5_000, 2.5, 8_000_000, 0.3),
                translucencyByDistance: new Cesium.NearFarScalar(5_000, 1.0, 12_000_000, 0.0),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
            });
        }

        viewer.scene.primitives.add(this.collection);
        console.log(`[TrafficParticleSystem] Initialized ${cfg.count} particles on ${this.roads.length} roads`);
    }

    tick(_viewer: Viewer, _Cesium: typeof import("cesium"), deltaSec: number): void {
        if (!this.tParams || !this.speeds || !this.collection) return;

        const count = this.particleCount;
        const t = this.tParams;
        const spd = this.speeds;

        for (let i = 0; i < count; i++) {
            t[i] += spd[i] * deltaSec;
            if (t[i] >= 1.0) t[i] -= 1.0;
            else if (t[i] < 0.0) t[i] += 1.0;

            const pos = this.interpolatePosition(i);
            this.collection.get(i).position = pos;
        }
    }

    destroy(viewer: Viewer): void {
        if (this.collection) {
            viewer.scene.primitives.remove(this.collection);
            this.collection = null;
        }
        this.roads = [];
        this.tParams = null;
        this.speeds = null;
        this.roadIdx = null;
        this.scratch = null;
        this.CesiumRef = null;
        this.particleCount = 0;
    }

    /* ---------------------------------------------------------------- */
    /*  Interpolation                                                    */
    /* ---------------------------------------------------------------- */

    /**
     * Given a particle index, returns its Cartesian3 position on its road.
     * Uses binary search on pre-computed cumulative arc lengths, then lerps.
     */
    private interpolatePosition(i: number): any {
        const road = this.roads[this.roadIdx![i]];
        const targetLen = this.tParams![i] * road.totalLength;
        const cum = road.cumLengths;

        // Binary search for the segment containing targetLen
        let lo = 0;
        let hi = road.vertexCount - 1;
        while (lo < hi - 1) {
            const mid = (lo + hi) >> 1;
            if (cum[mid] <= targetLen) lo = mid;
            else hi = mid;
        }

        const segStart = cum[lo];
        const segEnd = cum[hi];
        const segLen = segEnd - segStart;
        const frac = segLen > 0 ? (targetLen - segStart) / segLen : 0;

        const p = road.positions;
        const ai = lo * 3;
        const bi = hi * 3;

        const scratch = this.scratch;
        scratch.x = p[ai] + (p[bi] - p[ai]) * frac;
        scratch.y = p[ai + 1] + (p[bi + 1] - p[ai + 1]) * frac;
        scratch.z = p[ai + 2] + (p[bi + 2] - p[ai + 2]) * frac;

        // Return a copy — PointPrimitive stores by reference
        return this.CesiumRef!.Cartesian3.clone(scratch);
    }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function buildSegment(
    raw: RawRoadLine,
    Cesium: typeof import("cesium"),
): RoadSegment {
    const n = raw.vertexCount;
    const positions = new Float64Array(n * 3);
    const cumLengths = new Float64Array(n);

    // Convert lon/lat → Cartesian3 and store flat
    for (let i = 0; i < n; i++) {
        const lon = raw.coords[i * 2];
        const lat = raw.coords[i * 2 + 1];
        const c3 = Cesium.Cartesian3.fromDegrees(lon, lat);
        positions[i * 3] = c3.x;
        positions[i * 3 + 1] = c3.y;
        positions[i * 3 + 2] = c3.z;
    }

    // Pre-compute cumulative arc lengths
    cumLengths[0] = 0;
    for (let i = 1; i < n; i++) {
        const ai = (i - 1) * 3;
        const bi = i * 3;
        const dx = positions[bi] - positions[ai];
        const dy = positions[bi + 1] - positions[ai + 1];
        const dz = positions[bi + 2] - positions[ai + 2];
        cumLengths[i] = cumLengths[i - 1] + Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    return {
        positions,
        cumLengths,
        totalLength: cumLengths[n - 1],
        vertexCount: n,
    };
}
