# Agent 06 — Flights Handoff

## What Changed
- `src/layers/flights/openSkyApi.ts` — OpenSky Network API client (anonymous, bbox)
- `src/layers/flights/FlightLayer.ts` — LayerPlugin with 15s polling + stale cleanup
- `src/layers/flights/index.ts` — barrel export

## How to Test
1. Register: `LayerRegistry.register(new FlightLayer())`
2. Toggle "Live Flights" → yellow dots appear for aircraft
3. Positions update every 15 seconds
4. Stale aircraft are automatically removed

## Known Issues
- Anonymous OpenSky API: ~10 req/min rate limit
- Max 200 aircraft rendered
- Labels hidden by default
- No bounding box filtering yet (loads global data)
