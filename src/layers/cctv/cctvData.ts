/**
 * Sample CCTV camera data for demonstration.
 * In production, this would come from PostGIS or an API.
 */

export interface CCTVCamera {
    id: string;
    name: string;
    longitude: number;
    latitude: number;
    status: "online" | "offline" | "maintenance";
    type: "fixed" | "ptz" | "dome";
    location: string;
}

export const SAMPLE_CAMERAS: CCTVCamera[] = [
    {
        id: "cam-001",
        name: "Sydney Harbour Bridge",
        longitude: 151.2106,
        latitude: -33.8523,
        status: "online",
        type: "ptz",
        location: "Sydney, Australia",
    },
    {
        id: "cam-002",
        name: "Opera House Forecourt",
        longitude: 151.2153,
        latitude: -33.8568,
        status: "online",
        type: "dome",
        location: "Sydney, Australia",
    },
    {
        id: "cam-003",
        name: "Circular Quay Station",
        longitude: 151.2111,
        latitude: -33.8612,
        status: "offline",
        type: "fixed",
        location: "Sydney, Australia",
    },
    {
        id: "cam-004",
        name: "Times Square North",
        longitude: -73.9857,
        latitude: 40.758,
        status: "online",
        type: "ptz",
        location: "New York, USA",
    },
    {
        id: "cam-005",
        name: "Piccadilly Circus",
        longitude: -0.1340,
        latitude: 51.5099,
        status: "online",
        type: "dome",
        location: "London, UK",
    },
    {
        id: "cam-006",
        name: "Shibuya Crossing",
        longitude: 139.7006,
        latitude: 35.6595,
        status: "maintenance",
        type: "ptz",
        location: "Tokyo, Japan",
    },
    {
        id: "cam-007",
        name: "Eiffel Tower Base",
        longitude: 2.2945,
        latitude: 48.8584,
        status: "online",
        type: "fixed",
        location: "Paris, France",
    },
    {
        id: "cam-008",
        name: "Bondi Beach",
        longitude: 151.2749,
        latitude: -33.8908,
        status: "online",
        type: "dome",
        location: "Sydney, Australia",
    },
];
