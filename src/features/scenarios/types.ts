/**
 * Scenario type definitions.
 */

export interface ScenarioTarget {
    label: string;
    lat: number;
    lon: number;
    category: "primary" | "secondary" | "interest";
}

export interface ScenarioCameraPreset {
    lat: number;
    lon: number;
    altitude: number; // meters
    heading: number;   // degrees
    pitch: number;     // degrees
}

export interface Scenario {
    id: string;
    name: string;
    codename: string;
    description: string;
    startIso: string;
    stopIso: string;
    seekIso: string; // initial seek point
    camera: ScenarioCameraPreset;
    targets: ScenarioTarget[];
    enableLayers: string[];  // layer IDs to auto-enable
    color: string;           // accent color
}
