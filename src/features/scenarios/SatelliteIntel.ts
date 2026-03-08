/**
 * SatelliteIntel — computes which satellites pass over a target area
 * during a time window. Identifies operator/country and flags recon assets.
 *
 * Uses satellite.js TLE propagation to compute ground tracks, then checks
 * if the sub-satellite point falls within observation range of targets.
 */
import * as sat from "satellite.js";
import type { SatelliteRecord } from "../../layers/satellites/types.ts";
import type { ScenarioTarget } from "./types.ts";

/** Classification of a satellite operator */
export interface SatOperator {
    country: string;
    countryCode: string;  // ISO 2-letter
    agency: string;
    flag: string;
}

/** A satellite pass over the target area */
export interface SatPass {
    satellite: SatelliteRecord;
    operator: SatOperator;
    isRecon: boolean;
    reconType: string | null;  // "IMAGING" | "RADAR" | "SIGINT" | "ELINT" | null
    passes: PassWindow[];
    closestApproachKm: number;
    closestTarget: string;
    /** Flag for potential tasking (recon sat with unusually close pass) */
    likelyTasked: boolean;
}

export interface PassWindow {
    enterIso: string;
    exitIso: string;
    peakIso: string;
    peakAltKm: number;
    peakDistKm: number;  // closest approach to any target
    nearestTarget: string;
}

// ── Operator identification from satellite name ─────────────────────

const OPERATOR_PATTERNS: [RegExp, SatOperator][] = [
    [/^USA[ -]\d/i, { country: "United States", countryCode: "US", agency: "NRO/DoD", flag: "\uD83C\uDDFA\uD83C\uDDF8" }],
    [/^NROL/i, { country: "United States", countryCode: "US", agency: "NRO", flag: "\uD83C\uDDFA\uD83C\uDDF8" }],
    [/^KEYHOLE|^KH-/i, { country: "United States", countryCode: "US", agency: "NRO", flag: "\uD83C\uDDFA\uD83C\uDDF8" }],
    [/^LACROSSE/i, { country: "United States", countryCode: "US", agency: "NRO", flag: "\uD83C\uDDFA\uD83C\uDDF8" }],
    [/^WORLDVIEW/i, { country: "United States", countryCode: "US", agency: "Maxar", flag: "\uD83C\uDDFA\uD83C\uDDF8" }],
    [/^SKYSAT/i, { country: "United States", countryCode: "US", agency: "Planet Labs", flag: "\uD83C\uDDFA\uD83C\uDDF8" }],
    [/^PLANETSCOPE|^FLOCK|^DOVE/i, { country: "United States", countryCode: "US", agency: "Planet Labs", flag: "\uD83C\uDDFA\uD83C\uDDF8" }],
    [/^STARLINK/i, { country: "United States", countryCode: "US", agency: "SpaceX", flag: "\uD83C\uDDFA\uD83C\uDDF8" }],
    [/^GLOBALSTAR/i, { country: "United States", countryCode: "US", agency: "Globalstar", flag: "\uD83C\uDDFA\uD83C\uDDF8" }],
    [/^IRIDIUM/i, { country: "United States", countryCode: "US", agency: "Iridium", flag: "\uD83C\uDDFA\uD83C\uDDF8" }],
    [/^GPS/i, { country: "United States", countryCode: "US", agency: "USSF", flag: "\uD83C\uDDFA\uD83C\uDDF8" }],

    [/^COSMOS|^KOSMOS/i, { country: "Russia", countryCode: "RU", agency: "MoD/Roscosmos", flag: "\uD83C\uDDF7\uD83C\uDDFA" }],
    [/^RESURS/i, { country: "Russia", countryCode: "RU", agency: "Roscosmos", flag: "\uD83C\uDDF7\uD83C\uDDFA" }],
    [/^GLONASS/i, { country: "Russia", countryCode: "RU", agency: "Roscosmos", flag: "\uD83C\uDDF7\uD83C\uDDFA" }],
    [/^BARS-M/i, { country: "Russia", countryCode: "RU", agency: "MoD", flag: "\uD83C\uDDF7\uD83C\uDDFA" }],
    [/^KONDOR/i, { country: "Russia", countryCode: "RU", agency: "MoD", flag: "\uD83C\uDDF7\uD83C\uDDFA" }],
    [/^LIANA|^LOTOS|^PION/i, { country: "Russia", countryCode: "RU", agency: "MoD SIGINT", flag: "\uD83C\uDDF7\uD83C\uDDFA" }],

    [/^YAOGAN/i, { country: "China", countryCode: "CN", agency: "PLA/SSF", flag: "\uD83C\uDDE8\uD83C\uDDF3" }],
    [/^GAOFEN/i, { country: "China", countryCode: "CN", agency: "CNSA", flag: "\uD83C\uDDE8\uD83C\uDDF3" }],
    [/^JILIN/i, { country: "China", countryCode: "CN", agency: "Chang Guang", flag: "\uD83C\uDDE8\uD83C\uDDF3" }],
    [/^BEIDOU/i, { country: "China", countryCode: "CN", agency: "CNSA", flag: "\uD83C\uDDE8\uD83C\uDDF3" }],
    [/^SHIJIAN/i, { country: "China", countryCode: "CN", agency: "PLA", flag: "\uD83C\uDDE8\uD83C\uDDF3" }],
    [/^ZIYUAN/i, { country: "China", countryCode: "CN", agency: "CNSA", flag: "\uD83C\uDDE8\uD83C\uDDF3" }],
    [/^SUPERVIEW|^BEIJING/i, { country: "China", countryCode: "CN", agency: "CGSTL", flag: "\uD83C\uDDE8\uD83C\uDDF3" }],

    [/^OFEK/i, { country: "Israel", countryCode: "IL", agency: "IAI/MoD", flag: "\uD83C\uDDEE\uD83C\uDDF1" }],
    [/^EROS/i, { country: "Israel", countryCode: "IL", agency: "ImageSat", flag: "\uD83C\uDDEE\uD83C\uDDF1" }],
    [/^TECSAR|^OFEQ/i, { country: "Israel", countryCode: "IL", agency: "IAI/MoD", flag: "\uD83C\uDDEE\uD83C\uDDF1" }],

    [/^PLEIADES/i, { country: "France", countryCode: "FR", agency: "Airbus DS", flag: "\uD83C\uDDEB\uD83C\uDDF7" }],
    [/^CSO-/i, { country: "France", countryCode: "FR", agency: "DGA/MoD", flag: "\uD83C\uDDEB\uD83C\uDDF7" }],
    [/^HELIOS/i, { country: "France", countryCode: "FR", agency: "DGA/MoD", flag: "\uD83C\uDDEB\uD83C\uDDF7" }],
    [/^SPOT/i, { country: "France", countryCode: "FR", agency: "CNES/Airbus", flag: "\uD83C\uDDEB\uD83C\uDDF7" }],

    [/^SAR-LUPE/i, { country: "Germany", countryCode: "DE", agency: "Bundeswehr", flag: "\uD83C\uDDE9\uD83C\uDDEA" }],
    [/^SARAH/i, { country: "Germany", countryCode: "DE", agency: "OHB/BAAINBw", flag: "\uD83C\uDDE9\uD83C\uDDEA" }],

    [/^SENTINEL/i, { country: "EU", countryCode: "EU", agency: "ESA/Copernicus", flag: "\uD83C\uDDEA\uD83C\uDDFA" }],

    [/^RADARSAT/i, { country: "Canada", countryCode: "CA", agency: "CSA", flag: "\uD83C\uDDE8\uD83C\uDDE6" }],

    [/^KOMPSAT/i, { country: "South Korea", countryCode: "KR", agency: "KARI", flag: "\uD83C\uDDF0\uD83C\uDDF7" }],
    [/^CARTOSAT|^RESOURCESAT|^RISAT/i, { country: "India", countryCode: "IN", agency: "ISRO", flag: "\uD83C\uDDEE\uD83C\uDDF3" }],

    [/^ALOS|^IGS/i, { country: "Japan", countryCode: "JP", agency: "JAXA/Cabinet", flag: "\uD83C\uDDEF\uD83C\uDDF5" }],

    [/^TURKSAT/i, { country: "Turkey", countryCode: "TR", agency: "Turksat", flag: "\uD83C\uDDF9\uD83C\uDDF7" }],
    [/^GOKTURK/i, { country: "Turkey", countryCode: "TR", agency: "TAF", flag: "\uD83C\uDDF9\uD83C\uDDF7" }],

    [/^ONEWEB/i, { country: "UK", countryCode: "GB", agency: "OneWeb", flag: "\uD83C\uDDEC\uD83C\uDDE7" }],
];

const RECON_PATTERNS: [RegExp, string][] = [
    [/^USA[ -]\d/i, "IMAGING"],
    [/^NROL/i, "IMAGING"],
    [/^KEYHOLE|^KH-/i, "IMAGING"],
    [/^LACROSSE/i, "RADAR"],
    [/^WORLDVIEW/i, "IMAGING"],
    [/^SKYSAT/i, "IMAGING"],
    [/^COSMOS (2\d{3})/i, "SIGINT"],   // Recent Cosmos are often recon
    [/^BARS-M/i, "IMAGING"],
    [/^KONDOR/i, "RADAR"],
    [/^LIANA|^LOTOS|^PION/i, "SIGINT"],
    [/^YAOGAN/i, "IMAGING"],
    [/^GAOFEN/i, "IMAGING"],
    [/^JILIN/i, "IMAGING"],
    [/^SHIJIAN/i, "ELINT"],
    [/^OFEK/i, "IMAGING"],
    [/^EROS/i, "IMAGING"],
    [/^TECSAR/i, "RADAR"],
    [/^CSO-/i, "IMAGING"],
    [/^HELIOS/i, "IMAGING"],
    [/^SAR-LUPE/i, "RADAR"],
    [/^SARAH/i, "RADAR"],
    [/^SENTINEL-1/i, "RADAR"],
    [/^SENTINEL-2/i, "IMAGING"],
    [/^PLEIADES/i, "IMAGING"],
    [/^RADARSAT/i, "RADAR"],
    [/^KOMPSAT-[35]/i, "IMAGING"],
    [/^RISAT/i, "RADAR"],
    [/^CARTOSAT/i, "IMAGING"],
    [/^IGS/i, "IMAGING"],
    [/^GOKTURK/i, "IMAGING"],
    [/^SUPERVIEW/i, "IMAGING"],
];

const UNKNOWN_OPERATOR: SatOperator = {
    country: "Unknown",
    countryCode: "XX",
    agency: "Unknown",
    flag: "\uD83C\uDFF3\uFE0F",
};

function identifyOperator(name: string): SatOperator {
    for (const [pat, op] of OPERATOR_PATTERNS) {
        if (pat.test(name)) return op;
    }
    return UNKNOWN_OPERATOR;
}

function identifyRecon(name: string): { isRecon: boolean; type: string | null } {
    for (const [pat, type] of RECON_PATTERNS) {
        if (pat.test(name)) return { isRecon: true, type };
    }
    return { isRecon: false, type: null };
}

// ── Pass computation ────────────────────────────────────────────────

/** Haversine distance in km between two lat/lon points */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * (Math.PI / 180)) *
            Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Iran bounding box with margin for off-nadir viewing */
const IRAN_BBOX = {
    minLat: 24,
    maxLat: 41,
    minLon: 43,
    maxLon: 64,
};

/**
 * Compute satellite passes over the target area.
 * @param records      All loaded satellite TLE records
 * @param targets      Scenario target locations
 * @param startIso     Window start
 * @param stopIso      Window end
 * @param stepSec      Propagation step (default 60s)
 * @param maxRangeKm   Max distance from target to count as pass (default 800km)
 */
export function computeSatellitePasses(
    records: SatelliteRecord[],
    targets: ScenarioTarget[],
    startIso: string,
    stopIso: string,
    stepSec = 60,
    maxRangeKm = 800
): SatPass[] {
    const startMs = new Date(startIso).getTime();
    const stopMs = new Date(stopIso).getTime();
    const results: SatPass[] = [];

    for (const record of records) {
        const operator = identifyOperator(record.name);
        const { isRecon, type: reconType } = identifyRecon(record.name);

        let inPass = false;
        let currentPass: PassWindow | null = null;
        const passes: PassWindow[] = [];
        let globalClosest = Infinity;
        let globalClosestTarget = "";

        for (let t = startMs; t <= stopMs; t += stepSec * 1000) {
            const date = new Date(t);
            const pv = sat.propagate(record.satrec, date);
            const posEci = pv.position;

            if (!posEci || typeof posEci === "boolean") continue;

            const gmst = sat.gstime(date);
            const posGd = sat.eciToGeodetic(posEci as sat.EciVec3<number>, gmst);
            const latDeg = posGd.latitude * (180 / Math.PI);
            const lonDeg = posGd.longitude * (180 / Math.PI);
            const altKm = posGd.height;

            // Quick bounding box check first
            if (
                latDeg < IRAN_BBOX.minLat ||
                latDeg > IRAN_BBOX.maxLat ||
                lonDeg < IRAN_BBOX.minLon ||
                lonDeg > IRAN_BBOX.maxLon
            ) {
                if (inPass && currentPass) {
                    currentPass.exitIso = new Date(t - stepSec * 1000).toISOString();
                    passes.push(currentPass);
                    currentPass = null;
                    inPass = false;
                }
                continue;
            }

            // Find closest target
            let minDist = Infinity;
            let nearestTarget = "";
            for (const tgt of targets) {
                const d = haversineKm(latDeg, lonDeg, tgt.lat, tgt.lon);
                if (d < minDist) {
                    minDist = d;
                    nearestTarget = tgt.label;
                }
            }

            if (minDist > maxRangeKm) {
                if (inPass && currentPass) {
                    currentPass.exitIso = date.toISOString();
                    passes.push(currentPass);
                    currentPass = null;
                    inPass = false;
                }
                continue;
            }

            if (minDist < globalClosest) {
                globalClosest = minDist;
                globalClosestTarget = nearestTarget;
            }

            if (!inPass) {
                inPass = true;
                currentPass = {
                    enterIso: date.toISOString(),
                    exitIso: date.toISOString(),
                    peakIso: date.toISOString(),
                    peakAltKm: altKm,
                    peakDistKm: minDist,
                    nearestTarget,
                };
            } else if (currentPass && minDist < currentPass.peakDistKm) {
                currentPass.peakIso = date.toISOString();
                currentPass.peakDistKm = minDist;
                currentPass.peakAltKm = altKm;
                currentPass.nearestTarget = nearestTarget;
            }
        }

        // Close final pass if still open
        if (inPass && currentPass) {
            currentPass.exitIso = new Date(stopMs).toISOString();
            passes.push(currentPass);
        }

        if (passes.length > 0) {
            results.push({
                satellite: record,
                operator,
                isRecon,
                reconType,
                passes,
                closestApproachKm: Math.round(globalClosest),
                closestTarget: globalClosestTarget,
                likelyTasked: isRecon && globalClosest < 200,
            });
        }
    }

    // Sort: recon + likely tasked first, then by closest approach
    results.sort((a, b) => {
        if (a.likelyTasked !== b.likelyTasked) return a.likelyTasked ? -1 : 1;
        if (a.isRecon !== b.isRecon) return a.isRecon ? -1 : 1;
        return a.closestApproachKm - b.closestApproachKm;
    });

    return results;
}
