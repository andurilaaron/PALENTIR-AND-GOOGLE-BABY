# Agent 05 — Satellites Handoff

## What Changed
- `src/layers/satellites/tleParser.ts` — CelesTrak 3-line TLE parser
- `src/layers/satellites/propagator.ts` — Keplerian orbit propagator
- `src/layers/satellites/SatelliteLayer.ts` — LayerPlugin with real-time updates
- `src/layers/satellites/index.ts` — barrel export

## How to Test
1. Register in App.tsx: `LayerRegistry.register(new SatelliteLayer())`
2. Toggle "Satellites (ISS+)" → green dots appear at satellite positions
3. Positions update every ~1 second
4. Toggle off → all satellite entities removed

## Known Issues
- Simplified Keplerian propagation (not full SGP4) — positions approximate
- Max 50 satellites rendered for performance
- Labels hidden by default (show on zoom)
- Requires internet to fetch TLE data from CelesTrak
