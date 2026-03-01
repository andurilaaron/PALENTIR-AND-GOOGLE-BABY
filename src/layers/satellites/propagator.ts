/**
 * SGP4 Propagator — compute satellite position at a given time from TLE.
 *
 * Uses simplified SGP4 via the satellite.js-style math.
 * For production, swap in the `satellite.js` npm package.
 * This implementation uses Cesium's built-in SampledPositionProperty
 * with pre-computed orbit points for performance.
 */
import type { TLERecord } from "./tleParser.ts";

/** Orbital elements extracted from TLE */
export interface OrbitalElements {
    name: string;
    inclination: number;    // degrees
    raan: number;           // Right Ascension of Ascending Node, degrees
    eccentricity: number;
    argPerigee: number;     // degrees
    meanAnomaly: number;    // degrees
    meanMotion: number;     // revolutions per day
    epochYear: number;
    epochDay: number;
}

/**
 * Extract orbital elements from a TLE record.
 * Reference: https://en.wikipedia.org/wiki/Two-line_element_set
 */
export function extractElements(tle: TLERecord): OrbitalElements {
    const line1 = tle.line1;
    const line2 = tle.line2;

    // Epoch year (2-digit) and day
    let epochYear = parseInt(line1.substring(18, 20), 10);
    epochYear = epochYear < 57 ? 2000 + epochYear : 1900 + epochYear;
    const epochDay = parseFloat(line1.substring(20, 32));

    // Line 2 fields
    const inclination = parseFloat(line2.substring(8, 16));
    const raan = parseFloat(line2.substring(17, 25));
    const eccentricity = parseFloat("0." + line2.substring(26, 33).trim());
    const argPerigee = parseFloat(line2.substring(34, 42));
    const meanAnomaly = parseFloat(line2.substring(43, 51));
    const meanMotion = parseFloat(line2.substring(52, 63));

    return {
        name: tle.name,
        inclination,
        raan,
        eccentricity,
        argPerigee,
        meanAnomaly,
        meanMotion,
        epochYear,
        epochDay,
    };
}

/**
 * Simple Keplerian propagation (no perturbations).
 * Returns [longitude, latitude, altitude_km] at a given Date.
 *
 * For real applications, use satellite.js for full SGP4.
 */
export function propagate(
    elements: OrbitalElements,
    date: Date
): { lon: number; lat: number; alt: number } {
    const MU = 398600.4418; // Earth's gravitational parameter km³/s²
    const RE = 6371.0; // Earth radius km
    const DEG = Math.PI / 180;

    // Semi-major axis from mean motion
    const n = (elements.meanMotion * 2 * Math.PI) / 86400; // rad/s
    const a = Math.pow(MU / (n * n), 1 / 3); // km

    // Time since epoch
    const epochDate = new Date(
        Date.UTC(elements.epochYear, 0, 1)
    );
    epochDate.setTime(
        epochDate.getTime() + (elements.epochDay - 1) * 86400000
    );
    const dt = (date.getTime() - epochDate.getTime()) / 1000; // seconds

    // Mean anomaly at time
    const M = (elements.meanAnomaly * DEG + n * dt) % (2 * Math.PI);

    // Solve Kepler's equation (simple iteration)
    let E = M;
    for (let i = 0; i < 10; i++) {
        E = M + elements.eccentricity * Math.sin(E);
    }

    // True anomaly
    const cosV =
        (Math.cos(E) - elements.eccentricity) /
        (1 - elements.eccentricity * Math.cos(E));
    const sinV =
        (Math.sqrt(1 - elements.eccentricity * elements.eccentricity) *
            Math.sin(E)) /
        (1 - elements.eccentricity * Math.cos(E));
    const v = Math.atan2(sinV, cosV);

    // Distance
    const r = a * (1 - elements.eccentricity * Math.cos(E));

    // Altitude
    const alt = r - RE;

    // Argument of latitude
    const u = v + elements.argPerigee * DEG;

    // RAAN with Earth rotation
    const omega =
        elements.raan * DEG -
        (7.2921159e-5) * dt; // Earth rotation rate * time

    // Position in ECI → approximate geodetic
    const i = elements.inclination * DEG;
    const lat = Math.asin(Math.sin(i) * Math.sin(u));
    const lon = Math.atan2(
        Math.cos(i) * Math.sin(u),
        Math.cos(u)
    ) + omega;

    return {
        lon: ((lon / DEG + 180) % 360) - 180,
        lat: lat / DEG,
        alt: Math.max(alt, 200), // Clamp minimum altitude
    };
}
