# Agent 07 — Earthquakes + Traffic Handoff

## What Changed
- `src/layers/earthquakes/EarthquakeLayer.ts` — USGS 24h feed, magnitude-colored points
- `src/layers/earthquakes/index.ts`
- `src/layers/traffic/TrafficLayer.ts` — Demo traffic heatmap with 10 global hotspots
- `src/layers/traffic/index.ts`

## How to Test
1. Register both: `LayerRegistry.register(new EarthquakeLayer())` and `LayerRegistry.register(new TrafficLayer())`
2. Toggle "Earthquakes (24h)" → colored dots appear (red=M6+, orange=M5+, yellow=M4+)
3. Toggle "Traffic Heatmap" → red glowing hotspots appear at major cities
4. Both toggle off cleanly

## Known Issues
- Earthquakes: max 150 rendered, labels only for M4+
- Traffic: demo data only — needs real API for production
