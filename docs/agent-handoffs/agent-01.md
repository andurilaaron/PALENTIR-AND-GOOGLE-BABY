# Agent 01 — Core Architecture Handoff

## What Changed

### New files (src/core/**)
- `src/core/LayerPlugin.ts` — Plugin interface contract (id, label, category, enabled, status, onAdd, onRemove, onTick)
- `src/core/LayerRegistry.ts` — Singleton registry with register/unregister/enable/disable, Cesium clock tick loop, subscribe/notify
- `src/core/AppState.ts` — Minimal typed state container (ui, layers, effects) with getState/setState/subscribe
- `src/core/ViewerContext.tsx` — React Context + ViewerProvider + useViewer() hook
- `src/core/useLayerRegistry.ts` — React hook for reactive layer list + toggle
- `src/core/DummyLayer.ts` — Test plugin that logs lifecycle events to console
- `src/core/index.ts` — Barrel export

### New files (src/ui/**)
- `src/ui/LayerPanel.tsx` — Glassmorphic layer panel overlay with toggle switches + status
- `src/ui/styles/layers-panel.css` — Custom dark theme with backdrop blur, toggle switches, animations

### Modified files
- `src/App.tsx` — Wrapped with ViewerProvider, attached LayerRegistry, registered DummyLayer, mounted LayerPanel

## How to Test
1. `npm run build` — must pass
2. `npm run dev` — open http://localhost:5173
3. Verify:
   - Globe renders
   - Layer panel appears top-left with glassmorphic styling
   - "Test Layer" appears with toggle switch
   - Toggle ON → console shows "[DummyLayer] ✅ Added to viewer"
   - Toggle OFF → console shows "[DummyLayer] ❌ Removed from viewer"
   - Status badge updates (idle → loading → ready)
   - After ~5 seconds of enabled, console shows tick logs

## Known Issues / Limitations
- DummyLayer is the only registered layer (by design — real layers come from Agents 2–8)
- AppState is created but not wired to LayerRegistry yet (intentional — effects agent will use it)
- No TopBar component yet (was deprioritized in favor of core plugin architecture)

## What NOT to Merge if Failing
- If `npm run build` fails
- If the globe doesn't render
- If LayerPanel doesn't appear
- If toggle switches don't call onAdd/onRemove (check console logs)
