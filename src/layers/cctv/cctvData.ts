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
    streamUrl?: string;
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
        streamUrl: "https://www.youtube.com/embed/5uZa3-RMFos?autoplay=1&mute=1",
    },
    {
        id: "cam-002",
        name: "Opera House Forecourt",
        longitude: 151.2153,
        latitude: -33.8568,
        status: "online",
        type: "dome",
        location: "Sydney, Australia",
        streamUrl: "https://www.youtube.com/embed/6Xxb5uikewE?autoplay=1&mute=1",
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
        streamUrl: "https://www.youtube.com/embed/AdUw5RdyZxI?autoplay=1&mute=1",
    },
    {
        id: "cam-005",
        name: "Walworth Road",
        longitude: -0.0943,
        latitude: 51.4925,
        status: "online",
        type: "dome",
        location: "London, UK",
        streamUrl: "https://www.youtube.com/embed/8JCk5M_xrBs?autoplay=1&mute=1",
    },
    {
        id: "cam-006",
        name: "Shibuya Crossing",
        longitude: 139.7006,
        latitude: 35.6595,
        status: "online",
        type: "ptz",
        location: "Tokyo, Japan",
        streamUrl: "https://www.youtube.com/embed/8H3nRCFVR6Y?autoplay=1&mute=1",
    },
    {
        id: "cam-007",
        name: "Shinjuku Intersection",
        longitude: 139.7005,
        latitude: 35.6938,
        status: "online",
        type: "fixed",
        location: "Tokyo, Japan",
        streamUrl: "https://www.youtube.com/embed/6dp-bvQ7RWo?autoplay=1&mute=1",
    },
    {
        id: "cam-008",
        name: "Coney Island Beach",
        longitude: -73.9790,
        latitude: 40.5749,
        status: "online",
        type: "dome",
        location: "New York, USA",
        streamUrl: "https://www.youtube.com/embed/H67j7H-7QD0?autoplay=1&mute=1",
    },
];
