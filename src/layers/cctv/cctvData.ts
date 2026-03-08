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
        id: "cam-alpha-01",
        name: "CAM-ALPHA-01",
        longitude: -110.7624,
        latitude: 43.4799,
        status: "online",
        type: "ptz",
        location: "Jackson Hole Town Square, Wyoming, USA",
        streamUrl: "https://www.youtube.com/embed/1EiC9bvVGnk?autoplay=1&mute=1",
    },
    {
        id: "cam-bravo-02",
        name: "CAM-BRAVO-02",
        longitude: -0.1778,
        latitude: 51.5320,
        status: "online",
        type: "fixed",
        location: "Abbey Road Crossing, London, UK",
        streamUrl: "https://www.youtube.com/embed/b1ULEMfKbvE?autoplay=1&mute=1",
    },
    {
        id: "cam-charlie-03",
        name: "CAM-CHARLIE-03",
        longitude: 139.7006,
        latitude: 35.6595,
        status: "online",
        type: "ptz",
        location: "Shibuya Scramble, Tokyo, Japan",
        streamUrl: "https://www.youtube.com/embed/3n5muEWaE_Q?autoplay=1&mute=1",
    },
    {
        id: "cam-delta-04",
        name: "CAM-DELTA-04",
        longitude: 0,
        latitude: 0,
        status: "online",
        type: "dome",
        location: "International Space Station (Low Earth Orbit)",
        streamUrl: "https://www.youtube.com/embed/P9C25Un7xaM?autoplay=1&mute=1",
    },
    {
        id: "cam-echo-05",
        name: "CAM-ECHO-05",
        longitude: 126.9882,
        latitude: 37.5512,
        status: "maintenance",
        type: "fixed",
        location: "Namsan Tower, Seoul, South Korea",
        streamUrl: "https://www.youtube.com/embed/FYe3schAR5I?autoplay=1&mute=1",
    },
    {
        id: "cam-foxtrot-06",
        name: "CAM-FOXTROT-06",
        longitude: 12.3345,
        latitude: 45.4371,
        status: "online",
        type: "dome",
        location: "Venice Grand Canal, Italy",
        streamUrl: "https://www.youtube.com/embed/vPbQcM4k1Ys?autoplay=1&mute=1",
    },
    {
        id: "cam-golf-07",
        name: "CAM-GOLF-07",
        longitude: -73.9857,
        latitude: 40.758,
        status: "online",
        type: "ptz",
        location: "Times Square, New York, USA",
        streamUrl: "https://www.youtube.com/embed/AdUw5RdyZxI?autoplay=1&mute=1",
    },
    {
        id: "cam-hotel-08",
        name: "CAM-HOTEL-08",
        longitude: 151.2767,
        latitude: -33.8915,
        status: "online",
        type: "fixed",
        location: "Bondi Beach, Sydney, Australia",
        streamUrl: "https://www.youtube.com/embed/vxhp5catqdE?autoplay=1&mute=1",
    },
    {
        id: "cam-india-09",
        name: "CAM-INDIA-09",
        longitude: -157.8278,
        latitude: 21.2766,
        status: "online",
        type: "dome",
        location: "Waikiki Beach, Hawaii, USA",
        streamUrl: "https://www.youtube.com/embed/U1VTS08hPjk?autoplay=1&mute=1",
    },
    {
        id: "cam-juliet-10",
        name: "CAM-JULIET-10",
        longitude: 4.4995,
        latitude: 51.9036,
        status: "online",
        type: "ptz",
        location: "Port of Rotterdam, Netherlands",
        streamUrl: "https://www.youtube.com/embed/1YjQGjAdKnE?autoplay=1&mute=1",
    },
    {
        id: "cam-kilo-11",
        name: "CAM-KILO-11",
        longitude: 55.2708,
        latitude: 25.2048,
        status: "maintenance",
        type: "dome",
        location: "Dubai Skyline, UAE",
        streamUrl: "https://www.youtube.com/embed/mUGPhGDjA_k?autoplay=1&mute=1",
    },
    {
        id: "cam-lima-12",
        name: "CAM-LIMA-12",
        longitude: -80.6490,
        latitude: 28.5728,
        status: "offline",
        type: "fixed",
        location: "Kennedy Space Center, Florida, USA",
    },
];
