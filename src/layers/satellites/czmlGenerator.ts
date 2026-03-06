/**
 * czmlGenerator — converts SatelliteRecords + time window into a CZML document.
 *
 * Pre-computes positions via satellite.js TLE propagation, encodes as CZML
 * cartographicDegrees with Lagrange interpolation. Includes orbit path trails.
 */
import * as sat from "satellite.js";
import type { SatelliteRecord } from "./types.ts";

/**
 * Generate a CZML document array for the given satellites and time window.
 * @param records  Parsed TLE satellite records
 * @param start    Window start time
 * @param end      Window end time
 * @param stepSec  Sample interval in seconds (default 30)
 */
export function generateSatelliteCZML(
    records: SatelliteRecord[],
    start: Date,
    end: Date,
    stepSec = 30
): object[] {
    const interval = `${start.toISOString()}/${end.toISOString()}`;
    const epochIso = start.toISOString();

    const czml: object[] = [
        {
            id: "document",
            name: "Satellite Passes",
            version: "1.0",
        },
    ];

    for (const record of records) {
        const positions: number[] = [];
        let validCount = 0;

        for (let t = start.getTime(); t <= end.getTime(); t += stepSec * 1000) {
            const date = new Date(t);
            const pv = sat.propagate(record.satrec, date);
            const posEci = pv.position;

            if (!posEci || typeof posEci === "boolean") continue;

            const gmst = sat.gstime(date);
            const posGd = sat.eciToGeodetic(
                posEci as sat.EciVec3<number>,
                gmst
            );

            const lonDeg = posGd.longitude * (180 / Math.PI);
            const latDeg = posGd.latitude * (180 / Math.PI);
            const altM = posGd.height * 1000;

            const secFromEpoch = (t - start.getTime()) / 1000;
            positions.push(secFromEpoch, lonDeg, latDeg, altM);
            validCount++;
        }

        if (validCount < 2) continue;

        // Color by orbit category
        let rgba = [126, 212, 255, 220]; // LEO — cyan
        if (record.orbitCategory === "MEO") rgba = [255, 170, 0, 220];
        if (record.orbitCategory === "GEO") rgba = [255, 85, 85, 220];

        const trailRgba = [rgba[0], rgba[1], rgba[2], 80];

        czml.push({
            id: `sat-${record.id}`,
            name: record.name,
            availability: interval,
            position: {
                interpolationAlgorithm: "LAGRANGE",
                interpolationDegree: 5,
                referenceFrame: "FIXED",
                epoch: epochIso,
                cartographicDegrees: positions,
            },
            point: {
                pixelSize: 5,
                color: { rgba },
                outlineColor: { rgba: [rgba[0], rgba[1], rgba[2], 150] },
                outlineWidth: 2,
                disableDepthTestDistance: 1e12,
            },
            label: {
                text: record.name,
                font: "10px ui-monospace, SFMono-Regular, monospace",
                fillColor: { rgba: [255, 255, 255, 255] },
                style: "FILL",
                verticalOrigin: "BOTTOM",
                pixelOffset: { cartesian2: [0, -8] },
                showBackground: true,
                backgroundColor: { rgba: [10, 16, 28, 200] },
                disableDepthTestDistance: 1e12,
                distanceDisplayCondition: {
                    distanceDisplayCondition: [0, 15000000],
                },
            },
            path: {
                material: {
                    solidColor: {
                        color: { rgba: trailRgba },
                    },
                },
                width: 1.5,
                leadTime: 2700, // 45 min ahead
                trailTime: 2700, // 45 min behind
                resolution: 60,
            },
            properties: {
                isSatellite: true,
                record: {
                    name: record.name,
                    id: record.id,
                    orbitCategory: record.orbitCategory,
                },
            },
        });
    }

    return czml;
}
