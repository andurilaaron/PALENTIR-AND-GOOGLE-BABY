/**
 * OpenSky API client — fetch real-time aircraft positions.
 *
 * Uses anonymous access (no API key needed).
 * Rate limit: ~10 requests/minute for anonymous users.
 */

export interface Aircraft {
    icao24: string;
    callsign: string;
    longitude: number;
    latitude: number;
    altitude: number; // meters
    velocity: number; // m/s
    heading: number;  // degrees
    verticalRate: number; // m/s
    onGround: boolean;
}

const OPENSKY_URL = "https://opensky-network.org/api/states/all";

/**
 * Fetch aircraft within a bounding box.
 * bbox: [minLat, maxLat, minLon, maxLon]
 */
export async function fetchAircraft(
    bbox?: [number, number, number, number]
): Promise<Aircraft[]> {
    let url = OPENSKY_URL;
    if (bbox) {
        const [minLat, maxLat, minLon, maxLon] = bbox;
        url += `?lamin=${minLat}&lamax=${maxLat}&lomin=${minLon}&lomax=${maxLon}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`OpenSky API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.states) return [];

    return data.states
        .filter(
            (s: unknown[]) =>
                s[5] != null && s[6] != null && !s[8] // has coords and not on ground
        )
        .slice(0, 200) // Limit for performance
        .map((s: unknown[]): Aircraft => ({
            icao24: s[0] as string,
            callsign: ((s[1] as string) || "").trim(),
            longitude: s[5] as number,
            latitude: s[6] as number,
            altitude: (s[13] as number) || (s[7] as number) || 10000,
            velocity: (s[9] as number) || 0,
            heading: (s[10] as number) || 0,
            verticalRate: (s[11] as number) || 0,
            onGround: s[8] as boolean,
        }));
}
