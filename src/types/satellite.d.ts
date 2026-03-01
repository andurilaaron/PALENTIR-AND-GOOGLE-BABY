declare module 'satellite.js' {
    export interface SatRec {
        error: number;
        satnum: string;
        epochyr: number;
        epochdays: number;
        inclo: number;
        nodeo: number;
        ecco: number;
        argpo: number;
        mo: number;
        no_kozai: number;
        bstar: number;
    }

    export interface EciVec3<T> {
        x: T;
        y: T;
        z: T;
    }

    export interface GeodeticLocation {
        longitude: number;
        latitude: number;
        height: number;
    }

    export function twoline2satrec(line1: string, line2: string): SatRec;
    export function propagate(satrec: SatRec, date: Date): { position: EciVec3<number> | boolean, velocity: EciVec3<number> | boolean };
    export function gstime(date: Date): number;
    export function eciToGeodetic(eci: EciVec3<number>, gmst: number): GeodeticLocation;
}
