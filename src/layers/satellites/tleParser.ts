import { twoline2satrec } from "satellite.js";
import type { SatelliteRecord } from "./types.ts";

function determineOrbitCategory(meanMotion: number): SatelliteRecord["orbitCategory"] {
    // Mean motion (revolutions per day) determines orbit type roughly
    if (meanMotion > 11.25) return "LEO";
    if (meanMotion < 11.25 && meanMotion > 2) return "MEO";
    if (meanMotion <= 2 && meanMotion > 0.9) return "GEO";
    return "UNKNOWN";
}

export function parseTLE(tleData: string): SatelliteRecord[] {
    const lines = tleData
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    const records: SatelliteRecord[] = [];

    // TLEs format usually comes in blocks of 3 lines: Name, Line 1, Line 2
    for (let i = 0; i < lines.length - 2; i += 3) {
        const name = lines[i];
        const line1 = lines[i + 1];
        const line2 = lines[i + 2];

        // Basic validation
        if (line1.startsWith("1 ") && line2.startsWith("2 ")) {
            const id = line2.substring(2, 7).trim();
            try {
                const satrec = twoline2satrec(line1, line2);
                const category = determineOrbitCategory(satrec.no_kozai * (1440 / (2 * Math.PI))); // convert to revs/day roughly

                records.push({
                    id,
                    name,
                    orbitCategory: category,
                    satrec,
                });
            } catch (err) {
                console.warn(`[TLE Parser] Failed to parse: ${name}`);
            }
        }
    }
    return records;
}
