# AGENT 07 — EARTHQUAKES + TRAFFIC LAYERS
**Branch:** `feat/earthquakes-traffic`
**Lane:** `src/layers/earthquakes/**` + `src/layers/traffic/**` ONLY

---

## Mission
Add two data layers: (1) Real-time earthquake data from USGS, (2) Traffic/heatmap overlay. Both as LayerPlugin implementations.

## Deliverables

### Part A: Earthquakes

#### 1. EarthquakeLayer plugin (`src/layers/earthquakes/EarthquakeLayer.ts`)
- Implements `LayerPlugin` from `src/core/LayerPlugin.ts`
- `onAdd(viewer)`:
  - Fetch from USGS GeoJSON feed: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson`
  - Parse features into earthquake records
  - Create Cesium entities: pulsing circles at earthquake locations
  - Size scaled by magnitude, color by depth
- `onRemove(viewer)`:
  - Remove all earthquake entities
- Polling: refresh every 5 minutes

#### 2. USGS API client (`src/layers/earthquakes/usgsApi.ts`)
- Fetch GeoJSON feed (public, no key needed)
- Parse: magnitude, location, depth, time, felt reports, tsunami flag
- Support different time windows: past hour, past day, past week

#### 3. Earthquake entity styling
- Concentric rings pulsing animation for recent quakes
- Color scale: yellow (shallow) → orange (mid) → red (deep)
- Size proportional to magnitude
- Label showing magnitude + location on hover

#### 4. Earthquake info panel (`src/layers/earthquakes/EarthquakeInfoPanel.tsx`)
- Click earthquake → show:
  - Magnitude, depth, location name
  - Time (relative + absolute)
  - Felt reports, tsunami alert status
  - Link to USGS detail page

### Part B: Traffic

#### 5. TrafficLayer plugin (`src/layers/traffic/TrafficLayer.ts`)
- Implements `LayerPlugin`
- Displays a traffic density heatmap overlay
- Uses sample/mock data for major cities initially
- Can be extended later with real API data

#### 6. Traffic heatmap rendering (`src/layers/traffic/heatmapRenderer.ts`)
- Cesium-compatible heatmap using GroundPrimitive or Entity rectangles
- Color gradient: green (light) → yellow (moderate) → red (heavy)

## Acceptance Tests
- Earthquakes toggle on → quake markers appear with animation
- Click quake → info panel with magnitude/depth
- Traffic toggle on → heatmap overlay visible
- Toggle off → layers cleanly removed
- Both layers work simultaneously
- `npm run build` passes

## Do-Not-Touch Boundaries
- Do NOT edit `src/core/**` (import types only)
- Do NOT edit `src/ui/**`
- Do NOT edit `src/App.tsx`
- Do NOT add API keys (USGS is public)

## File Structure
```
src/layers/earthquakes/
├── EarthquakeLayer.ts
├── usgsApi.ts
├── EarthquakeInfoPanel.tsx
├── types.ts
├── index.ts
└── AGENTS.md

src/layers/traffic/
├── TrafficLayer.ts
├── heatmapRenderer.ts
├── types.ts
├── index.ts
└── AGENTS.md
```

## Handoff Note
Write: `docs/agent-handoffs/agent-07.md`
Include: what changed, how to test, known issues/limitations, what NOT to merge if failing
