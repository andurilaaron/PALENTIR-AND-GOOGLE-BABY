# Agent 08 — CCTV Handoff

## What Changed
- `src/layers/cctv/cctvData.ts` — 8 sample cameras at global landmarks
- `src/layers/cctv/CCTVLayer.ts` — LayerPlugin with SVG icons + info panels
- `src/layers/cctv/index.ts` — barrel export

## How to Test
1. Register: `LayerRegistry.register(new CCTVLayer())`
2. Toggle "CCTV Cameras" → camera icons at Sydney, NYC, London, Tokyo, Paris
3. Click a camera → info panel shows status, type, location, coords
4. Colors: green=online, red=offline, amber=maintenance
