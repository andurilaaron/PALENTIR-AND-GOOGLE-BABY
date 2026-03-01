# AGENT 03 — POST-PROCESSING EFFECTS (PostFX)
**Branch:** `feat/postfx`
**Lane:** `src/postfx/**`, `src/ui/PostFxPanel.tsx` ONLY

---

## Mission
Implement visual post-processing effects: CRT scanline, Night Vision (NVG), and Thermal view modes. Toggled via a UI panel. Must integrate with AppState effects.mode.

## Deliverables

### 1. PostFX Engine (`src/postfx/PostFxEngine.ts`)
- Takes a Cesium.Viewer reference
- Methods: `setMode(mode: EffectMode)`, `getMode()`
- Modes: `"NORMAL"`, `"CRT"`, `"NVG"`, `"THERMAL"`
- `NORMAL`: disables all custom post-process stages
- `CRT`: green-tinted scanline overlay, slight barrel distortion, phosphor glow
- `NVG`: green monochrome, grain noise, vignette
- `THERMAL`: false-color heat map effect
- Uses Cesium's `PostProcessStage` / `PostProcessStageComposite`
- GLSL fragment shaders for each effect

### 2. Shader files
- `src/postfx/shaders/crt.glsl`
- `src/postfx/shaders/nvg.glsl`
- `src/postfx/shaders/thermal.glsl`

### 3. PostFxPanel (`src/ui/PostFxPanel.tsx`)
- Row of mode buttons: NORMAL | CRT | NVG | THERMAL
- Active mode highlighted
- Positioned top-right as an overlay
- Calls PostFxEngine.setMode() on click
- Reads/writes AppState.effects.mode

### 4. Registration
- Export `createPostFxEngine(viewer)` factory
- Integrator wires it after viewer is ready

## Acceptance Tests
- Click CRT → scanline effect visible
- Click NVG → green night vision effect visible
- Click THERMAL → thermal effect visible
- Click NORMAL → all effects removed
- No console errors
- `npm run build` passes

## Do-Not-Touch Boundaries
- Do NOT edit `src/core/**` (import types only)
- Do NOT edit `src/layers/**`
- Do NOT edit `src/App.tsx`
- Do NOT edit `vite.config.ts`, `package.json`
- Do NOT add API keys

## File Structure
```
src/postfx/
├── PostFxEngine.ts
├── shaders/
│   ├── crt.glsl
│   ├── nvg.glsl
│   └── thermal.glsl
├── index.ts
└── AGENTS.md
src/ui/
└── PostFxPanel.tsx
```

## Handoff Note
Write: `docs/agent-handoffs/agent-03.md`
Include: what changed, how to test, known issues/limitations, what NOT to merge if failing
