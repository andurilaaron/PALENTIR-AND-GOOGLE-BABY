/**
 * Pre-configured scenario presets.
 */
import type { Scenario } from "./types.ts";

export const SCENARIOS: Scenario[] = [
    {
        id: "epic-fury",
        name: "Operation EPIC FURY",
        codename: "EPIC FURY",
        description:
            "Initial strikes on Iranian nuclear and military infrastructure. " +
            "First impact 2:30 AM local (23:00 UTC 27 Feb). " +
            "Multi-axis kinetic operations across 7 target complexes.",
        startIso: "2026-02-27T21:00:00Z",
        stopIso: "2026-02-28T08:00:00Z",
        seekIso: "2026-02-27T22:50:00Z", // 10 min before first impact
        camera: {
            lat: 33.5,
            lon: 51.5,
            altitude: 2500000, // 2500 km — full Iran overview
            heading: 0,
            pitch: -90, // straight down
        },
        targets: [
            { label: "TEHRAN", lat: 35.6892, lon: 51.3890, category: "primary" },
            { label: "ISFAHAN", lat: 32.6546, lon: 51.6680, category: "primary" },
            { label: "NATANZ", lat: 33.5100, lon: 51.9270, category: "primary" },
            { label: "FORDOW", lat: 34.8800, lon: 51.5900, category: "primary" },
            { label: "QOM", lat: 34.6416, lon: 50.8746, category: "secondary" },
            { label: "KARAJ", lat: 35.8400, lon: 50.9710, category: "secondary" },
            { label: "KERMANSHAH", lat: 34.3142, lon: 47.0650, category: "secondary" },
        ],
        enableLayers: ["flights", "military-flights", "satellites"],
        color: "#ef4444",
    },
];
