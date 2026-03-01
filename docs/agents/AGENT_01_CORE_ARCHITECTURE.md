# AGENT 01 — TECH LEAD / INTEGRATOR
**Branch:** `chore/core-architecture`
**Lane:** `src/core/**`, `src/ui/LayerPanel.tsx`, wiring points only

---

## Mission
Implement core plugin architecture, viewer boot, UI shell. Must NOT touch Google tiles.

## Deliverables

### 1. LayerPlugin contract (`src/core/LayerPlugin.ts`)
```typescript
export interface LayerPlugin {
  id: string;
  label: string;
  category: LayerCategory;
  enabled: boolean;
  status: LayerStatus;
  onAdd(viewer: Cesium.Viewer): void | Promise<void>;
  onRemove(viewer: Cesium.Viewer): void;
  onTick?(viewer: Cesium.Viewer, time: Cesium.JulianDate): void;
}
```

### 2. LayerRegistry (`src/core/LayerRegistry.ts`)
- Singleton registry that stores all registered `LayerPlugin` instances
- `register(plugin)`, `unregister(id)`, `getAll()`, `getById(id)`
- `enableLayer(id)` / `disableLayer(id)` — calls `onAdd`/`onRemove`
- Update loop: on each Cesium clock tick, calls `onTick()` on enabled layers
- `subscribe(listener)` → unsubscribe pattern for UI reactivity

### 3. AppState (`src/core/AppState.ts`)
- Minimal typed state container (no external libs):
  - `ui: { isLayersOpen: boolean }`
  - `layers: Record<string, boolean>`
  - `effects: { mode: "NORMAL" | "CRT" | "NVG" | "THERMAL" }`
- Expose: `getState()`, `setState(partial)`, `subscribe(listener) → unsubscribe`

### 4. ViewerContext (`src/core/ViewerContext.tsx`)
- React Context that provides the Cesium.Viewer instance to child components
- `ViewerProvider` wraps the app
- `useViewer()` hook returns the viewer or null

### 5. LayerPanel UI (`src/ui/LayerPanel.tsx`)
- Glassmorphic panel, top-left overlay
- Shows all registered layers with toggle switches
- Reads from LayerRegistry, toggles call `enableLayer`/`disableLayer`
- Shows layer status (idle/loading/ready/error)
- Count of enabled layers in header

### 6. Dummy layer for testing (`src/core/DummyLayer.ts`)
- Implements LayerPlugin interface
- Logs to console on add/remove/tick
- Used to verify the architecture works end-to-end

### 7. Minimal wiring in `src/App.tsx`
- Mount ViewerProvider
- Mount LayerPanel as absolute-position overlay
- Register DummyLayer on viewer ready
- Must NOT change Cesium initialization logic beyond wrapping with provider

## Viewer Boot Sequence
- Set `window.CESIUM_BASE_URL = "/cesium/"` BEFORE Cesium import in viewer module
- No external CDN anywhere

## Acceptance Tests
- Globe renders
- Dummy layer toggles on/off (console logs confirm)
- No Cesium worker/asset errors in console
- `npm run build` passes

## Do-Not-Touch Boundaries
- Do NOT add Google tiles
- Do NOT add postfx or shot planner or real feeds
- Do NOT place any key in code
- Do NOT edit: `public/cesium/**`, `scripts/**`, `vite.config.ts`
- Do NOT edit `package.json` unless absolutely required (justify in handoff)

## Handoff Note
Write: `docs/agent-handoffs/agent-01.md`
Include: what changed, how to test, known issues/limitations, what NOT to merge if failing
