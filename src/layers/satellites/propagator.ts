import * as satellite from "satellite.js";
import * as Cesium from "cesium";

export function getSatellitePosition(
    satrec: satellite.SatRec,
    date: Date
): Cesium.Cartesian3 | undefined {
    // Propagate satellite position
    const positionAndVelocity = satellite.propagate(satrec, date);

    const positionEci = positionAndVelocity.position as satellite.EciVec3<number> | boolean;

    if (!positionEci || typeof positionEci === "boolean") {
        return undefined; // Could not propagate (satellite crashed or invalid parameters)
    }

    // Convert ECI (Earth-Centered Inertial) to Geodetic (Lat/Lon/Alt)
    const gmst = satellite.gstime(date);
    const positionGd = satellite.eciToGeodetic(positionEci as satellite.EciVec3<number>, gmst);

    // Convert Geodetic to Cartesian3 for Cesium
    return Cesium.Cartesian3.fromRadians(
        positionGd.longitude,
        positionGd.latitude,
        positionGd.height * 1000 // Convert km to meters
    );
}

export function getSatelliteVelocity(
    satrec: satellite.SatRec,
    date: Date
): number | undefined {
    const positionAndVelocity = satellite.propagate(satrec, date);
    const velocityEci = positionAndVelocity.velocity as satellite.EciVec3<number> | boolean;

    if (!velocityEci || typeof velocityEci === "boolean") {
        return undefined;
    }

    // Velocity is in km/s. Calculate magnitude.
    const vx = velocityEci.x;
    const vy = velocityEci.y;
    const vz = velocityEci.z;
    const speedKmS = Math.sqrt(vx * vx + vy * vy + vz * vz);
    return speedKmS;
}

/**
 * Generates an array of positions projecting the satellite's future orbit in Earth-fixed coordinates.
 * This draws the familiar orbital path sine-waves around the rotating globe.
 */
export function generateOrbitPolyline(
    satrec: satellite.SatRec,
    startDate: Date,
    durationMinutes = 90, // Roughly one LEO orbit
    stepMinutes = 2 // 1 sample every 2 minutes
): Cesium.Cartesian3[] | undefined {
    const points: Cesium.Cartesian3[] = [];

    for (let i = 0; i <= durationMinutes; i += stepMinutes) {
        const time = new Date(startDate.getTime() + i * 60000);
        const position = getSatellitePosition(satrec, time);
        if (position) {
            points.push(position);
        }
    }

    if (points.length < 2) return undefined;

    return points;
}
