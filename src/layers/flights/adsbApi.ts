/**
 * adsbApi — real-time aircraft positions.
 *
 * Both are proxied through Vite dev server to avoid CORS blocks.
 */

// Track whether OpenSky proxy works – if it fails once we skip it to avoid repeated ENETUNREACH errors
let openSkyAvailable = true;

export interface Aircraft {
    icao24: string;
    callsign: string;
    longitude: number;
    latitude: number;
    altitude: number;    // metres MSL
    velocity: number;    // m/s
    heading: number;     // degrees true
    verticalRate: number; // m/s
    onGround: boolean;
    category?: string;
}

// --- OpenSky Network (primary) ----------------------------------------

function openSkyUrl(lat: number, lon: number, radiusNm: number): string {
    // Convert radius (nm) to degrees (rough): 1° ≈ 60nm
    const deg = (radiusNm / 60) * 1.15; // slight buffer
    const lamin = (lat - deg).toFixed(4);
    const lamax = (lat + deg).toFixed(4);
    const lomin = (lon - deg).toFixed(4);
    const lomax = (lon + deg).toFixed(4);
    return `/api/opensky/states/all?lamin=${lamin}&lamax=${lamax}&lomin=${lomin}&lomax=${lomax}`;
}

function parseOpenSky(data: any): Aircraft[] {
    if (!data?.states) return [];
    return (data.states as any[])
        .filter(s => s[5] != null && s[6] != null && !s[8]) // lon, lat, on_ground
        .slice(0, 300)
        .map((s): Aircraft => ({
            icao24: s[0] || "unknown",
            callsign: (s[1] || "").trim(),
            longitude: s[5],
            latitude: s[6],
            altitude: s[7] ?? s[13] ?? 10000, // baro_alt or geo_alt (metres)
            velocity: s[9] ?? 0,
            heading: s[10] ?? 0,
            verticalRate: s[11] ?? 0,
            onGround: false,
        }));
}

// --- airplanes.live (fallback) ----------------------------------------

function adsbLiveUrl(lat: number, lon: number, radiusNm: number): string {
    const r = Math.min(250, Math.max(1, Math.round(radiusNm)));
    return `/api/flights/point/${lat.toFixed(4)}/${lon.toFixed(4)}/${r}`;
}

function parseAdsbLive(data: any): Aircraft[] {
    if (!data?.ac) return [];
    return (data.ac as any[])
        .filter(ac => ac.lat != null && ac.lon != null && !ac.nog)
        .slice(0, 300)
        .map((ac): Aircraft => ({
            icao24: ac.hex || "unknown",
            callsign: (ac.flight || "").trim(),
            longitude: ac.lon,
            latitude: ac.lat,
            altitude: ac.alt_baro ? ac.alt_baro * 0.3048 : 10000,
            velocity: ac.gs ? ac.gs * 0.514444 : 0,
            heading: ac.track ?? ac.true_heading ?? ac.mag_heading ?? 0,
            verticalRate: ac.baro_rate ? (ac.baro_rate * 0.3048) / 60 : 0,
            onGround: false,
            category: ac.category,
        }));
}

// --- Public API -------------------------------------------------------

/**
 * Fetch aircraft near a point.
 * Tries OpenSky first, falls back to airplanes.live if OpenSky fails.
 */
export async function fetchAircraft(
    lat: number,
    lon: number,
    radiusNm: number
): Promise<Aircraft[]> {
    // --- Attempt 1: OpenSky Network (if still reachable) ---
    if (openSkyAvailable) {
        try {
            const res = await fetch(openSkyUrl(lat, lon, radiusNm), {
                headers: { "Accept": "application/json" }
            });
            if (res.ok) {
                const data = await res.json();
                const ac = parseOpenSky(data);
                console.log(`[adsbApi] OpenSky ✅ ${ac.length} aircraft`);
                return ac;
            }
            console.warn(`[adsbApi] OpenSky HTTP ${res.status} — trying fallback`);
            // If we get a non‑2xx response, assume OpenSky is temporarily unavailable
            openSkyAvailable = false;
            setTimeout(() => { openSkyAvailable = true; }, 60000);
        } catch (e) {
            console.warn("[adsbApi] OpenSky request failed — disabling OpenSky proxy for 60s:", e);
            openSkyAvailable = false;
            setTimeout(() => { openSkyAvailable = true; }, 60000);
        }
    }

    // --- Attempt 2: airplanes.live (fallback) ---
    const res2 = await fetch(adsbLiveUrl(lat, lon, radiusNm));
    if (!res2.ok) {
        throw new Error(`airplanes.live HTTP ${res2.status}`);
    }
    const data2 = await res2.json();
    const ac2 = parseAdsbLive(data2);
    console.log(`[adsbApi] airplanes.live fallback ✅ ${ac2.length} aircraft`);
    return ac2;
}

/** Military aircraft globally via airplanes.live /mil endpoint */
export async function fetchMilitaryAircraft(): Promise<Aircraft[]> {
    const res = await fetch("/api/flights/mil");
    if (!res.ok) throw new Error(`airplanes.live /mil HTTP ${res.status}`);
    const data = await res.json();
    return parseAdsbLive(data);
}
