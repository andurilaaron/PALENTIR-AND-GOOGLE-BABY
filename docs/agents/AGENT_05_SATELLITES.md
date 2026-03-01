# AGENT 05 — SATELLITES LAYER
**Branch:** `feat/satellites`
**Lane:** `src/layers/satellites/**` ONLY

---

## Mission
Add real-time satellite tracking using TLE (Two-Line Element) data from public sources. Display satellite positions on the globe with orbit paths. NORAD catalog support.

## Deliverables

### 1. SatelliteLayer plugin (`src/layers/satellites/SatelliteLayer.ts`)
- Implements `LayerPlugin` from `src/core/LayerPlugin.ts`
- `onAdd(viewer)`:
  - Fetch TLE data from CelesTrak (public, no API key needed): `https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle`
  - Parse TLE lines into satellite records
  - Use SGP4 propagation (via satellite.js or manual) to compute positions
  - Create Cesium entities for each satellite (point + label)
- `onRemove(viewer)`:
  - Remove all satellite entities
- `onTick(viewer, time)`:
  - Update satellite positions based on current Cesium clock time
  - Propagate orbits forward

### 2. TLE Parser (`src/layers/satellites/tleParser.ts`)
- Parse raw TLE text into structured records
- Extract: NORAD ID, name, inclination, mean motion, epoch, etc.

### 3. Orbit Propagator (`src/layers/satellites/propagator.ts`)
- SGP4/SDP4 propagation from TLE to ECI coordinates
- Convert ECI → ECEF → Cesium Cartesian3
- May use `satellite.js` if available in node_modules, otherwise implement simplified version

### 4. Satellite entity styling
- Small glowing dot for each satellite
- Label with NORAD ID on hover
- Orbit path line (optional, for selected satellite)
- Color coding by type (LEO, MEO, GEO)

### 5. Detection mode (`src/layers/satellites/DetectionPanel.tsx`)
- Click a satellite → show info panel with:
  - NORAD ID, Name, Orbit type
  - Current lat/lng/altitude
  - Velocity
  - Orbit period
- Ability to track (camera follows satellite)

## Acceptance Tests
- Toggle on → satellites appear on globe
- Satellites move with time (use Cesium clock animation)
- Click satellite → info panel shows
- Toggle off → satellites removed
- Works offline with cached TLE data
- `npm run build` passes

## Do-Not-Touch Boundaries
- Do NOT edit `src/core/**` (import types only)
- Do NOT edit `src/ui/**`
- Do NOT edit `src/App.tsx`
- Do NOT add API keys
- May add `satellite.js` to package.json IF needed (justify in handoff)

## File Structure
```
src/layers/satellites/
├── SatelliteLayer.ts
├── tleParser.ts
├── propagator.ts
├── DetectionPanel.tsx
├── types.ts
├── index.ts
└── AGENTS.md
```

## Handoff Note
Write: `docs/agent-handoffs/agent-05.md`
Include: what changed, how to test, known issues/limitations, what NOT to merge if failing
