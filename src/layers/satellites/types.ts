import type { SatRec } from "satellite.js";

export interface SatelliteRecord {
    id: string; // NORAD ID
    name: string;
    orbitCategory: "LEO" | "MEO" | "GEO" | "UNKNOWN";
    satrec: SatRec;
}
