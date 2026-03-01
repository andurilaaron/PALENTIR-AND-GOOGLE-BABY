# AGENT 06 — FLIGHTS LAYER
**Branch:** `feat/flights`
**Lane:** `src/layers/flights/**` ONLY

---

## Mission
Add real-time commercial and military aircraft tracking using the OpenSky Network API (free, no API key required for anonymous access). Display aircraft positions on the globe with flight paths.

## Deliverables

### 1. FlightLayer plugin (`src/layers/flights/FlightLayer.ts`)
- Implements `LayerPlugin` from `src/core/LayerPlugin.ts`
- `onAdd(viewer)`:
  - Fetch aircraft states from OpenSky: `https://opensky-network.org/api/states/all`
  - Parse response into aircraft records
  - Create Cesium entities for each aircraft (billboard/model + label)
  - Set up polling interval (every 10 seconds)
- `onRemove(viewer)`:
  - Clear polling interval
  - Remove all aircraft entities
- `onTick(viewer, time)`:
  - Interpolate positions between polls for smooth movement

### 2. OpenSky API client (`src/layers/flights/openSkyApi.ts`)
- Fetch all states (anonymous, no key): `GET /api/states/all`
- Fetch by bounding box for viewport-based loading
- Parse response: icao24, callsign, origin_country, longitude, latitude, baro_altitude, velocity, heading, vertical_rate, on_ground
- Rate limiting: max 1 request per 10 seconds (anonymous)
- Error handling with retry logic

### 3. Aircraft entity styling
- Airplane icon billboard, rotated by heading
- Color by altitude band (low=green, mid=yellow, high=blue)
- Label with callsign on hover
- Trail line showing recent path

### 4. Flight info panel (`src/layers/flights/FlightInfoPanel.tsx`)
- Click aircraft → show:
  - Callsign, ICAO24
  - Origin country
  - Altitude (barometric + geometric)
  - Velocity, heading
  - Vertical rate (climbing/descending indicator)
  - On ground status
- Track button (camera follows aircraft)

### 5. Viewport-based loading
- Only fetch aircraft visible in current viewport
- Use bounding box from viewer camera
- Reduces API load and rendering overhead

## Acceptance Tests
- Toggle on → aircraft appear on globe
- Aircraft positions update every 10s
- Click aircraft → info panel shows
- Toggle off → aircraft removed, polling stopped
- Graceful degradation if API is unavailable
- `npm run build` passes

## Do-Not-Touch Boundaries
- Do NOT edit `src/core/**` (import types only)
- Do NOT edit `src/ui/**`
- Do NOT edit `src/App.tsx`
- Do NOT add API keys (OpenSky anonymous access is key-free)

## File Structure
```
src/layers/flights/
├── FlightLayer.ts
├── openSkyApi.ts
├── FlightInfoPanel.tsx
├── types.ts
├── index.ts
└── AGENTS.md
```

## Handoff Note
Write: `docs/agent-handoffs/agent-06.md`
Include: what changed, how to test, known issues/limitations, what NOT to merge if failing
