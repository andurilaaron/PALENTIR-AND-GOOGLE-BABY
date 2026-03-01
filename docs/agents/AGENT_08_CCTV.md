# AGENT 08 — CCTV LAYER
**Branch:** `feat/cctv`
**Lane:** `src/layers/cctv/**` ONLY

---

## Mission
Add CCTV camera markers on the globe with info panels. Display camera locations, fields of view, and live stream placeholders. Data from local JSON or PostGIS database.

## Deliverables

### 1. CCTVLayer plugin (`src/layers/cctv/CCTVLayer.ts`)
- Implements `LayerPlugin` from `src/core/LayerPlugin.ts`
- `onAdd(viewer)`:
  - Load camera data from local JSON file or API endpoint
  - Create Cesium entities for each camera (billboard with camera icon)
  - Optional: show field-of-view cone for each camera
- `onRemove(viewer)`:
  - Remove all CCTV entities
- No polling needed (static data unless connected to API)

### 2. CCTV data source (`src/layers/cctv/cctvData.ts`)
- Hardcoded sample data for major cities (for demo):
  - Sydney, Melbourne, London, New York, Tokyo
  - Each camera: `{ id, name, lat, lng, heading, fov, type, status }`
- Factory to load from external API endpoint (future)

### 3. Camera entity styling
- Camera icon billboard at location
- Color by status: green (online), red (offline), yellow (maintenance)
- Optional: translucent cone showing field of view
- Cluster when zoomed out (if many cameras)

### 4. Camera info panel (`src/layers/cctv/CameraInfoPanel.tsx`)
- Click camera → show:
  - Camera name, ID
  - Location (lat/lng)
  - Type (dome, bullet, PTZ)
  - Status (online/offline)
  - Heading and FOV
  - Placeholder for live stream embed (future)

### 5. Database integration prep (`src/layers/cctv/cctvApi.ts`)
- Fetch function that can query PostGIS endpoint
- Uses `get_cameras_in_view(bbox)` when available
- Falls back to local JSON data if endpoint unavailable

## Acceptance Tests
- Toggle on → camera markers appear on globe
- Click camera → info panel shows details
- Toggle off → cameras removed
- Works with sample data (no database required)
- `npm run build` passes

## Do-Not-Touch Boundaries
- Do NOT edit `src/core/**` (import types only)
- Do NOT edit `src/ui/**`
- Do NOT edit `src/App.tsx`
- Do NOT add real API keys
- Do NOT edit database files

## File Structure
```
src/layers/cctv/
├── CCTVLayer.ts
├── cctvData.ts
├── cctvApi.ts
├── CameraInfoPanel.tsx
├── types.ts
├── index.ts
└── AGENTS.md
```

## Handoff Note
Write: `docs/agent-handoffs/agent-08.md`
Include: what changed, how to test, known issues/limitations, what NOT to merge if failing
