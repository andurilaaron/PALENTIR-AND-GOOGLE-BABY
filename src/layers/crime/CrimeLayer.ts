import type { Viewer } from "cesium";
import type { LayerPlugin, LayerCategory, LayerStatus } from "../../core/LayerPlugin.ts";

// ---------------------------------------------------------------------------
// Types for raw API responses
// ---------------------------------------------------------------------------

interface UKCrime {
    category: string;
    location: { latitude: string; longitude: string };
    month: string;
    id?: number;
    outcome_status?: { category: string } | null;
}

interface SFCrime {
    incident_category?: string;
    incident_subcategory?: string;
    incident_datetime?: string;
    point?: { coordinates: [number, number] };
    latitude?: string;
    longitude?: string;
}

interface AUCrime {
    lat: number;
    lon: number;
    category: string;
    suburb: string;
    state: string;
    count: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 60_000;

// Initial seed locations loaded on onAdd for immediate visible data
const SEED_LOCATIONS: Array<{ label: string; lat: number; lon: number; source: "uk" | "sf" | "au" }> = [
    { label: "London",        lat: 51.5074,  lon: -0.1278,   source: "uk" },
    { label: "San Francisco", lat: 37.7749,  lon: -122.4194, source: "sf" },
    { label: "Australia",     lat: -33.8688, lon: 151.2093,  source: "au" },
];

// Bounding box checks
function isUKArea(lat: number, lon: number): boolean {
    return lat >= 49.5 && lat <= 58.5 && lon >= -6.5 && lon <= 2.5;
}

function isSFArea(lat: number, lon: number): boolean {
    return lat >= 37.2 && lat <= 38.2 && lon >= -123.0 && lon <= -121.8;
}

function isAUArea(lat: number, lon: number): boolean {
    return lat >= -45.0 && lat <= -10.0 && lon >= 112.0 && lon <= 155.0;
}

// ---------------------------------------------------------------------------
// Category → colour mapping
// ---------------------------------------------------------------------------

function categoryColor(
    Cesium: typeof import("cesium"),
    category: string
): import("cesium").Color {
    const c = category.toLowerCase();
    if (/violent|assault|robbery|weapon|homicide|rape/.test(c))
        return Cesium.Color.RED.withAlpha(0.85);
    if (/theft|burglary|steal|larceny|auto|vehicle/.test(c))
        return Cesium.Color.ORANGE.withAlpha(0.85);
    if (/drug|narcotic|substance/.test(c))
        return Cesium.Color.fromCssColorString("#a855f7").withAlpha(0.85); // purple
    if (/anti.social|vandal|disorder|graffiti|criminal.damage/.test(c))
        return Cesium.Color.YELLOW.withAlpha(0.85);
    return Cesium.Color.fromCssColorString("#f59e0b").withAlpha(0.85); // amber fallback
}

function humanCategory(category: string): string {
    return category
        .replace(/-/g, " ")
        .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

// ---------------------------------------------------------------------------
// API fetchers
// ---------------------------------------------------------------------------

/** Returns the YYYY-MM string for two months ago (UK data has ~2-month lag). */
function ukDate(): string {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function fetchUKCrimes(lat: number, lon: number): Promise<UKCrime[]> {
    const date = ukDate();
    const url =
        `https://data.police.uk/api/crimes-street/all-crime` +
        `?lat=${lat}&lng=${lon}&date=${date}`;
    console.log(`[CrimeLayer] Fetching UK crimes: ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`UK Police API ${res.status}`);
    return res.json() as Promise<UKCrime[]>;
}

async function fetchSFCrimes(lat: number, lon: number): Promise<SFCrime[]> {
    const where = encodeURIComponent(`within_circle(point, ${lat}, ${lon}, 5000)`);
    const url =
        `https://data.sfgov.org/resource/wg3w-h783.json` +
        `?$limit=200&$where=${where}&$order=incident_datetime%20DESC`;
    console.log(`[CrimeLayer] Fetching SF crimes: ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SF OpenData API ${res.status}`);
    return res.json() as Promise<SFCrime[]>;
}

async function fetchAUCrimes(): Promise<AUCrime[]> {
    console.log("[CrimeLayer] Fetching AU crime hotspots");
    const res = await fetch("/api/data/au-crime");
    if (!res.ok) throw new Error(`AU crime data ${res.status}`);
    return res.json() as Promise<AUCrime[]>;
}

// ---------------------------------------------------------------------------
// Layer
// ---------------------------------------------------------------------------

export class CrimeLayer implements LayerPlugin {
    readonly id = "crime-abs";
    readonly label = "Crime Map (Live)";
    readonly category: LayerCategory = "custom";
    readonly icon = "🚨";
    readonly source = "UK Police / SF OpenData / ABS";

    enabled = false;
    status: LayerStatus = "idle";
    entityCount?: number;
    lastRefresh?: number;

    private CesiumRef: typeof import("cesium") | null = null;
    private entityIds: Set<string> = new Set();
    private pollTimer: ReturnType<typeof setTimeout> | null = null;
    private idCounter = 0;

    // ---------------------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------------------

    async onAdd(viewer: Viewer): Promise<void> {
        this.CesiumRef = await import("cesium");
        this.status = "loading";

        // Seed both known areas immediately for instant visible results
        const seedResults = await Promise.allSettled(
            SEED_LOCATIONS.map((loc) => this.fetchAndRender(viewer, loc.lat, loc.lon, loc.source))
        );
        for (const r of seedResults) {
            if (r.status === "rejected") console.warn("[CrimeLayer] Seed fetch failed:", r.reason);
        }

        this.entityCount = this.entityIds.size;
        this.lastRefresh = Date.now();
        this.status = "ready";
        console.log(`[CrimeLayer] Initial load: ${this.entityCount} incidents`);

        this.schedulePoll(viewer);
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
        this.entityCount = 0;
        this.CesiumRef = null;
        this.auLoaded = false;
        this.status = "idle";
        console.log("[CrimeLayer] Removed");
    }

    // ---------------------------------------------------------------------------
    // Polling
    // ---------------------------------------------------------------------------

    private schedulePoll(viewer: Viewer): void {
        if (this.pollTimer) clearTimeout(this.pollTimer);
        this.pollTimer = setTimeout(async () => {
            await this.pollCamera(viewer);
            this.schedulePoll(viewer);
        }, POLL_INTERVAL_MS);
    }

    /** On each poll, fetch crimes near whatever the camera is currently pointing at. */
    private async pollCamera(viewer: Viewer): Promise<void> {
        if (!this.CesiumRef) return;
        const Cesium = this.CesiumRef;

        let lat = 0;
        let lon = 0;

        try {
            const canvas = viewer.scene.canvas;
            const ray = viewer.camera.getPickRay(
                new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2)
            );
            const hit = ray ? viewer.scene.globe.pick(ray, viewer.scene) : undefined;
            if (hit) {
                const c = Cesium.Ellipsoid.WGS84.cartesianToCartographic(hit);
                lat = Cesium.Math.toDegrees(c.latitude);
                lon = Cesium.Math.toDegrees(c.longitude);
            } else {
                const cam = viewer.camera.positionCartographic;
                lat = Cesium.Math.toDegrees(cam.latitude);
                lon = Cesium.Math.toDegrees(cam.longitude);
            }
        } catch {
            try {
                const cam = viewer.camera.positionCartographic;
                lat = Cesium.Math.toDegrees(cam.latitude);
                lon = Cesium.Math.toDegrees(cam.longitude);
            } catch { return; }
        }

        // Decide which source(s) to query based on camera position
        const sources: Array<"uk" | "sf" | "au"> = [];
        if (isUKArea(lat, lon)) sources.push("uk");
        if (isSFArea(lat, lon)) sources.push("sf");
        if (isAUArea(lat, lon)) sources.push("au");
        // If none matches, fall back to whichever seed area is geographically closer
        if (sources.length === 0) {
            const dUK = Math.hypot(lat - 51.5074, lon - (-0.1278));
            const dSF = Math.hypot(lat - 37.7749, lon - (-122.4194));
            const dAU = Math.hypot(lat - (-33.8688), lon - 151.2093);
            const min = Math.min(dUK, dSF, dAU);
            if (min === dAU) sources.push("au");
            else sources.push(dUK <= dSF ? "uk" : "sf");
        }

        console.log(`[CrimeLayer] Poll at (${lat.toFixed(3)}, ${lon.toFixed(3)}) — sources: ${sources.join(", ")}`);

        const results = await Promise.allSettled(
            sources.map((src) => this.fetchAndRender(viewer, lat, lon, src))
        );
        for (const r of results) {
            if (r.status === "rejected") console.warn("[CrimeLayer] Poll fetch failed:", r.reason);
        }

        this.entityCount = this.entityIds.size;
        this.lastRefresh = Date.now();
    }

    // ---------------------------------------------------------------------------
    // Fetch + render helpers
    // ---------------------------------------------------------------------------

    private async fetchAndRender(
        viewer: Viewer,
        lat: number,
        lon: number,
        source: "uk" | "sf" | "au"
    ): Promise<void> {
        if (source === "uk") {
            const crimes = await fetchUKCrimes(lat, lon);
            console.log(`[CrimeLayer] UK: ${crimes.length} incidents`);
            this.renderUKCrimes(viewer, crimes);
        } else if (source === "sf") {
            const crimes = await fetchSFCrimes(lat, lon);
            console.log(`[CrimeLayer] SF: ${crimes.length} incidents`);
            this.renderSFCrimes(viewer, crimes);
        } else {
            const crimes = await fetchAUCrimes();
            console.log(`[CrimeLayer] AU: ${crimes.length} hotspots`);
            this.renderAUCrimes(viewer, crimes);
        }
    }

    private renderUKCrimes(viewer: Viewer, crimes: UKCrime[]): void {
        const Cesium = this.CesiumRef!;
        for (const crime of crimes) {
            const lat = parseFloat(crime.location.latitude);
            const lon = parseFloat(crime.location.longitude);
            if (!isFinite(lat) || !isFinite(lon)) continue;

            // Deduplicate by stable API id when available
            const id = crime.id ? `crime-uk-${crime.id}` : `crime-uk-${this.idCounter++}`;
            if (this.entityIds.has(id)) continue;

            const category = humanCategory(crime.category);
            const color = categoryColor(Cesium, crime.category);

            viewer.entities.add({
                id,
                name: `UK Crime: ${category}`,
                position: Cesium.Cartesian3.fromDegrees(lon, lat, 50),
                point: {
                    pixelSize: 7,
                    color,
                    outlineColor: Cesium.Color.BLACK.withAlpha(0.5),
                    outlineWidth: 1,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                },
                properties: {
                    isCrime: true,
                    source: "UK Police",
                    category,
                    month: crime.month,
                    outcome: crime.outcome_status?.category ?? "Unknown",
                },
            });
            this.entityIds.add(id);
        }
    }

    private renderSFCrimes(viewer: Viewer, crimes: SFCrime[]): void {
        const Cesium = this.CesiumRef!;
        for (const crime of crimes) {
            let lat: number;
            let lon: number;

            if (crime.point?.coordinates) {
                [lon, lat] = crime.point.coordinates; // GeoJSON order: [lon, lat]
            } else if (crime.latitude && crime.longitude) {
                lat = parseFloat(crime.latitude);
                lon = parseFloat(crime.longitude);
            } else {
                continue;
            }

            if (!isFinite(lat) || !isFinite(lon)) continue;

            const id = `crime-sf-${this.idCounter++}`;
            const category = humanCategory(
                crime.incident_category ?? crime.incident_subcategory ?? "Other"
            );
            const color = categoryColor(Cesium, category);

            viewer.entities.add({
                id,
                name: `SF Crime: ${category}`,
                position: Cesium.Cartesian3.fromDegrees(lon, lat, 50),
                point: {
                    pixelSize: 7,
                    color,
                    outlineColor: Cesium.Color.BLACK.withAlpha(0.5),
                    outlineWidth: 1,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                },
                properties: {
                    isCrime: true,
                    source: "SF OpenData",
                    category,
                    subcategory: crime.incident_subcategory ?? "",
                    datetime: crime.incident_datetime ?? "",
                },
            });
            this.entityIds.add(id);
        }
    }

    private auLoaded = false;

    private renderAUCrimes(viewer: Viewer, crimes: AUCrime[]): void {
        if (this.auLoaded) return; // Static dataset — only render once
        this.auLoaded = true;
        const Cesium = this.CesiumRef!;

        for (const crime of crimes) {
            const id = `crime-au-${this.idCounter++}`;
            if (this.entityIds.has(id)) continue;

            const category = humanCategory(crime.category);
            const color = categoryColor(Cesium, crime.category);
            // Scale point size by incident count
            const size = Math.min(12, Math.max(5, Math.round(crime.count / 100)));

            viewer.entities.add({
                id,
                name: `AU Crime: ${category}`,
                position: Cesium.Cartesian3.fromDegrees(crime.lon, crime.lat, 50),
                point: {
                    pixelSize: size,
                    color,
                    outlineColor: Cesium.Color.BLACK.withAlpha(0.5),
                    outlineWidth: 1,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                },
                label: {
                    text: crime.suburb,
                    font: "9px ui-monospace, monospace",
                    fillColor: color,
                    style: Cesium.LabelStyle.FILL,
                    showBackground: true,
                    backgroundColor: Cesium.Color.fromCssColorString("#0a101c").withAlpha(0.8),
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -10),
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 200000),
                },
                properties: {
                    isCrime: true,
                    source: `ABS / ${crime.state} Police`,
                    category,
                    suburb: crime.suburb,
                    state: crime.state,
                    count: `${crime.count} incidents/yr`,
                },
            });
            this.entityIds.add(id);
        }
    }
}
