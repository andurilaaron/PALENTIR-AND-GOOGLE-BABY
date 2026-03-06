/**
 * trafficRoadLoader — fetches pre-filtered Natural Earth major highway
 * geometry and returns interleaved lon/lat Float64Arrays for the particle
 * system.
 *
 * Phase 1: Major Highways only (~9 700 polylines globally, ~2.7 MB).
 * The static file is pre-filtered from ne_10m_roads — no properties,
 * geometry only.
 */

const ROADS_URL = "/major-highways.json";

export interface RawRoadLine {
    /** Interleaved [lon0, lat0, lon1, lat1, …] */
    coords: Float64Array;
    /** Number of vertices (coords.length / 2) */
    vertexCount: number;
}

export async function loadMajorRoads(): Promise<RawRoadLine[]> {
    const res = await fetch(ROADS_URL);
    if (!res.ok) throw new Error(`Road fetch failed: ${res.status}`);

    const geojson = await res.json();
    const lines: RawRoadLine[] = [];

    for (const feature of geojson.features) {
        const geom = feature.geometry;
        if (geom.type === "LineString") {
            pushLine(lines, geom.coordinates);
        } else if (geom.type === "MultiLineString") {
            for (const ring of geom.coordinates) {
                pushLine(lines, ring);
            }
        }
    }

    console.log(`[TrafficRoadLoader] Loaded ${lines.length} major highway segments`);
    return lines;
}

function pushLine(out: RawRoadLine[], coords: number[][]): void {
    if (coords.length < 2) return;
    const buf = new Float64Array(coords.length * 2);
    for (let i = 0; i < coords.length; i++) {
        buf[i * 2] = coords[i][0];     // lon
        buf[i * 2 + 1] = coords[i][1]; // lat
    }
    out.push({ coords: buf, vertexCount: coords.length });
}
