# AGENT 02 — GOOGLE PHOTOREALISTIC 3D TILES BASE LAYER
**Branch:** `feat/tiles-base-layer`
**Lane:** `src/layers/tiles/**` ONLY

---

## Mission
Add Google Photorealistic 3D Tiles as a base mode, reading the key only from Vite env (`import.meta.env.VITE_GOOGLE_MAPS_KEY`). No hardcoded keys. No "Hawk" references. Clean toggle.

## Deliverables

### 1. Base Map UI selector (or panel section)
- Standard Globe (default Cesium) — always available
- Photoreal 3D Tiles (Google) — requires valid API key

### 2. GoogleTilesLayer plugin (`src/layers/tiles/GoogleTilesLayer.ts`)
- Implements `LayerPlugin` from `src/core/LayerPlugin.ts`
- `onAdd(viewer)`:
  - Read key from `import.meta.env.VITE_GOOGLE_MAPS_KEY`
  - If key is missing/empty, set status to "error", log warning, return early
  - Create `Cesium.Cesium3DTileset` from Google's Photorealistic 3D Tiles URL
  - Add to viewer's scene primitives
- `onRemove(viewer)`:
  - Remove the tileset from scene primitives
  - Destroy the tileset
- `onTick`: not needed (tiles are static)

### 3. Env-only key retrieval
- Read key from: `import.meta.env.VITE_GOOGLE_MAPS_KEY`
- Never hardcode a key
- Never put key in any `.ts/.tsx` source as a literal string
- Must gracefully degrade if key is missing (show default Cesium globe)

### 4. Registration
- Export a `createGoogleTilesLayer()` factory function
- The integrator (Agent 1) or App.tsx will call this and register it

## Acceptance Tests
- With `.env.local` containing `VITE_GOOGLE_MAPS_KEY=<valid_key>`:
  - Toggle on → photorealistic tiles appear
  - Toggle off → tiles removed, default globe returns
- Without key:
  - Layer shows "error" status
  - Globe still works with default Cesium imagery
  - No console errors beyond the warning
- `npm run build` passes

## Do-Not-Touch Boundaries
- Do NOT edit `src/core/**` (import types only)
- Do NOT edit `src/ui/**`
- Do NOT edit `src/App.tsx`
- Do NOT edit `vite.config.ts`, `package.json`, `index.html`
- Do NOT add CDN script tags
- Do NOT create or edit `.env*` files

## File Structure
```
src/layers/tiles/
├── GoogleTilesLayer.ts
├── index.ts
└── AGENTS.md
```

## Handoff Note
Write: `docs/agent-handoffs/agent-02.md`
Include: what changed, how to test, known issues/limitations, what NOT to merge if failing
