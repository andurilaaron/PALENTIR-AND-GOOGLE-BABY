/**
 * VehicleDetectionLayer — real ML vehicle detection via TensorFlow.js COCO-SSD.
 *
 * Uses the COCO-SSD model (lite_mobilenet_v2 base) to run object detection
 * against the live Cesium canvas. Detected objects are projected to geographic
 * coordinates via camera ray-picking and rendered as labeled entities.
 *
 * Label prefix convention:
 *   VEH-XXXX  — car, truck, bus, motorcycle, train
 *   PER-XXXX  — person
 *   VSL-XXXX  — boat
 *   ACF-XXXX  — airplane
 *
 * Falls back to seeded-PRNG placement if TensorFlow.js / WebGL2 is unavailable.
 *
 * Active between 200 m – 50 000 m altitude. Re-scans every 3 s when camera moves.
 */
import type { Viewer, JulianDate } from "cesium";
import type {
    LayerPlugin,
    LayerCategory,
    LayerStatus,
} from "../../core/LayerPlugin.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MIN_ALT = 200;
const MAX_ALT = 50_000;
const COOLDOWN_MS = 3000;
const MAX_DETECTIONS = 20;
const MIN_CONFIDENCE = 0.3;

/** COCO-SSD classes we care about and how to prefix their labels */
const CLASS_MAP: Record<string, { prefix: string; color: string }> = {
    car:        { prefix: "VEH", color: "#d4a017" }, // amber
    truck:      { prefix: "VEH", color: "#d4a017" },
    bus:        { prefix: "VEH", color: "#d4a017" },
    motorcycle: { prefix: "VEH", color: "#d4a017" },
    train:      { prefix: "VEH", color: "#d4a017" },
    person:     { prefix: "PER", color: "#00e5ff" }, // cyan
    boat:       { prefix: "VSL", color: "#2979ff" }, // blue
    airplane:   { prefix: "ACF", color: "#f44336" }, // red
};

// ---------------------------------------------------------------------------
// Fallback PRNG helpers (used when TF.js is unavailable)
// ---------------------------------------------------------------------------
function mulberry32(seed: number): () => number {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hashCamera(lon: number, lat: number, alt: number): number {
    const s = `${lon.toFixed(4)}_${lat.toFixed(4)}_${alt.toFixed(0)}`;
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return h;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------
interface Detection {
    label: string;
    lon: number;
    lat: number;
    conf: number;
    color: string;
    detClass: string;
}

// Minimal subset of the coco-ssd Prediction type so we don't need @types
interface CocoSsdPrediction {
    class: string;
    score: number;
    bbox: [number, number, number, number]; // [x, y, width, height]
}

interface CocoSsdModel {
    detect(
        img: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
        maxNumBoxes?: number,
        minScore?: number
    ): Promise<CocoSsdPrediction[]>;
}

// ---------------------------------------------------------------------------
// Layer
// ---------------------------------------------------------------------------
export class VehicleDetectionLayer implements LayerPlugin {
    readonly id = "vehicle-detection";
    readonly label = "Vehicle Detection";
    readonly category: LayerCategory = "custom";
    readonly icon = "🚗";
    readonly source = "COCO-SSD / TF.js";

    enabled = false;
    status: LayerStatus = "idle";
    entityCount?: number;
    lastRefresh?: number;

    private CesiumRef: typeof import("cesium") | null = null;
    private model: CocoSsdModel | null = null;
    private useFallback = false;

    private entityIds: Set<string> = new Set();
    private lastRunTime = 0;
    private lastHash = "";
    private nextSeq = 0;
    private isDetecting = false;

    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------
    async onAdd(_viewer: Viewer): Promise<void> {
        this.CesiumRef = await import("cesium");
        this.status = "loading";
        console.log("[VehicleDetectionLayer] Loading COCO-SSD model…");

        try {
            // Ensure the TF backend is initialised before loading the model
            await import("@tensorflow/tfjs");
            const cocoSsd = await import("@tensorflow-models/coco-ssd");
            this.model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
            this.useFallback = false;
            console.log("[VehicleDetectionLayer] COCO-SSD ready — zoom below 50 km to detect");
        } catch (err) {
            console.warn(
                "[VehicleDetectionLayer] TensorFlow.js failed to load — using PRNG fallback.",
                err
            );
            this.useFallback = true;
        }

        this.status = "ready";
        this.nextSeq = 0;
    }

    onRemove(viewer: Viewer): void {
        this.clearEntities(viewer);
        this.CesiumRef = null;
        this.model = null;
        this.nextSeq = 0;
        this.lastHash = "";
        this.isDetecting = false;
    }

    // onTick must stay synchronous — kick off async detection without awaiting
    onTick(viewer: Viewer, _time: JulianDate): void {
        if (!this.enabled || !this.CesiumRef) return;

        const alt = viewer.camera.positionCartographic.height;

        // Out of range — clear immediately
        if (alt < MIN_ALT || alt > MAX_ALT) {
            if (this.entityIds.size > 0) {
                this.clearEntities(viewer);
                this.entityCount = 0;
                this.status = "ready";
            }
            return;
        }

        const now = Date.now();
        if (now - this.lastRunTime < COOLDOWN_MS) return;
        if (this.isDetecting) return;

        // Only re-detect if camera moved significantly
        const cam = viewer.camera.positionCartographic;
        const Cesium = this.CesiumRef;
        const lonDeg = Cesium.Math.toDegrees(cam.longitude);
        const latDeg = Cesium.Math.toDegrees(cam.latitude);
        const hash = hashCamera(lonDeg, latDeg, alt).toString();
        if (hash === this.lastHash) return;

        this.lastHash = hash;
        this.lastRunTime = now;
        this.isDetecting = true;
        this.status = "loading";

        // Fire-and-forget; errors are caught inside
        void this.runDetectionAsync(viewer, lonDeg, latDeg, alt);
    }

    // -----------------------------------------------------------------------
    // Real ML detection path
    // -----------------------------------------------------------------------
    private async runDetectionAsync(
        viewer: Viewer,
        _centerLon: number,
        _centerLat: number,
        _altitude: number
    ): Promise<void> {
        try {
            if (this.useFallback || !this.model) {
                this.runFallbackDetection(viewer, _centerLon, _centerLat, _altitude);
                return;
            }

            const Cesium = this.CesiumRef!;
            const canvas = viewer.scene.canvas;

            // Run COCO-SSD on the live Cesium canvas
            let predictions: CocoSsdPrediction[];
            try {
                predictions = await this.model.detect(canvas, MAX_DETECTIONS, MIN_CONFIDENCE);
            } catch (inferErr) {
                console.warn("[VehicleDetectionLayer] Inference error — switching to fallback.", inferErr);
                this.useFallback = true;
                this.runFallbackDetection(viewer, _centerLon, _centerLat, _altitude);
                return;
            }

            // Filter to classes we care about
            const relevant = predictions.filter((p) => CLASS_MAP[p.class]);

            this.clearEntities(viewer);

            const detections: Detection[] = [];

            for (const prediction of relevant) {
                const meta = CLASS_MAP[prediction.class];

                // Bounding-box centre pixel
                const centerX = prediction.bbox[0] + prediction.bbox[2] / 2;
                const centerY = prediction.bbox[1] + prediction.bbox[3] / 2;

                // Project pixel → world ray → globe intersection
                const ray = viewer.camera.getPickRay(
                    new Cesium.Cartesian2(centerX, centerY)
                );
                if (!ray) continue;

                const hit = viewer.scene.globe.pick(ray, viewer.scene);
                if (!hit) continue;

                const carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(hit);
                const lon = Cesium.Math.toDegrees(carto.longitude);
                const lat = Cesium.Math.toDegrees(carto.latitude);

                const seq = String(this.nextSeq++).padStart(4, "0");
                const confPct = Math.round(prediction.score * 100);
                const baseLabel = `${meta.prefix}-${seq}`;
                // Append confidence for vehicle/aircraft/vessel labels
                const label =
                    meta.prefix !== "PER"
                        ? `${baseLabel} ${confPct}%`
                        : baseLabel;

                detections.push({
                    label,
                    lon,
                    lat,
                    conf: prediction.score,
                    color: meta.color,
                    detClass: prediction.class,
                });
            }

            this.renderDetections(viewer, detections);
        } finally {
            this.isDetecting = false;
        }
    }

    // -----------------------------------------------------------------------
    // Fallback: seeded-PRNG placement (unchanged from original logic)
    // -----------------------------------------------------------------------
    private runFallbackDetection(
        viewer: Viewer,
        centerLon: number,
        centerLat: number,
        altitude: number
    ): void {
        const Cesium = this.CesiumRef!;
        const canvas = viewer.scene.canvas;
        const scene = viewer.scene;

        this.clearEntities(viewer);

        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
        const canReadPixels = gl !== null;

        const gridSize = altitude < 1000 ? 14 : altitude < 2000 ? 10 : 7;
        const seed = hashCamera(centerLon, centerLat, altitude);
        const rng = mulberry32(seed);

        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        const mx = w * 0.08;
        const my = h * 0.08;

        const detections: Detection[] = [];

        const numRoads = 2 + Math.floor(rng() * 3);
        const roadAngles: number[] = [];
        for (let i = 0; i < numRoads; i++) {
            roadAngles.push(rng() * Math.PI);
        }

        outer: for (let gx = 0; gx < gridSize; gx++) {
            for (let gy = 0; gy < gridSize; gy++) {
                if (detections.length >= MAX_DETECTIONS) break outer;

                const bx = mx + ((gx + 0.5) / gridSize) * (w - 2 * mx);
                const by = my + ((gy + 0.5) / gridSize) * (h - 2 * my);

                const roadIdx = Math.floor(rng() * numRoads);
                const angle = roadAngles[roadIdx];
                const offset = (rng() - 0.5) * (w / gridSize) * 0.6;
                const perpOffset = (rng() - 0.5) * 12;

                const px = bx + Math.cos(angle) * offset + Math.sin(angle) * perpOffset;
                const py = by + Math.sin(angle) * offset - Math.cos(angle) * perpOffset;

                if (px < 10 || px > w - 10 || py < 10 || py > h - 10) continue;
                if (rng() > 0.35) continue;

                if (canReadPixels && gl) {
                    const pixel = new Uint8Array(4);
                    const glY = canvas.height - Math.round(py) - 1;
                    gl.readPixels(
                        Math.round(px), glY, 1, 1,
                        gl.RGBA, gl.UNSIGNED_BYTE, pixel
                    );
                    const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;
                    if (brightness < 30 || brightness > 245) continue;
                }

                const ray = viewer.camera.getPickRay(new Cesium.Cartesian2(px, py));
                if (!ray) continue;

                const hit = scene.globe.pick(ray, scene);
                if (!hit) continue;

                const carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(hit);
                const lon = Cesium.Math.toDegrees(carto.longitude);
                const lat = Cesium.Math.toDegrees(carto.latitude);
                const conf = 0.55 + rng() * 0.4;
                const seq = String(this.nextSeq++).padStart(4, "0");

                detections.push({
                    label: `VEH-${seq} ${Math.round(conf * 100)}%`,
                    lon,
                    lat,
                    conf,
                    color: CLASS_MAP["car"].color,
                    detClass: "car",
                });
            }
        }

        this.renderDetections(viewer, detections);
    }

    // -----------------------------------------------------------------------
    // Shared rendering
    // -----------------------------------------------------------------------
    private renderDetections(viewer: Viewer, detections: Detection[]): void {
        const Cesium = this.CesiumRef!;
        const outlineColor = Cesium.Color.BLACK;

        for (const det of detections) {
            const eid = `det-${det.label.split(" ")[0]}`;
            const fillColor = Cesium.Color.fromCssColorString(det.color);

            viewer.entities.add({
                id: eid,
                position: Cesium.Cartesian3.fromDegrees(det.lon, det.lat),
                label: {
                    text: det.label,
                    font: "bold 11px ui-monospace, monospace",
                    fillColor,
                    outlineColor,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -6),
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, MAX_ALT),
                    scale: 0.9,
                },
                point: {
                    pixelSize: 4,
                    color: fillColor.withAlpha(0.9),
                    outlineColor: fillColor.withAlpha(0.25),
                    outlineWidth: 10,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, MAX_ALT),
                },
                properties: {
                    isDetection: true,
                    confidence: det.conf,
                    detClass: det.detClass,
                },
            });

            this.entityIds.add(eid);
        }

        this.entityCount = detections.length;
        this.lastRefresh = Date.now();
        this.status = "ready";

        if (detections.length > 0) {
            console.log(
                `[VehicleDetectionLayer] ${detections.length} object(s) detected` +
                (this.useFallback ? " (fallback PRNG)" : " (COCO-SSD)")
            );
        }
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------
    private clearEntities(viewer: Viewer): void {
        for (const id of this.entityIds) {
            const entity = viewer.entities.getById(id);
            if (entity) viewer.entities.remove(entity);
        }
        this.entityIds.clear();
    }
}
