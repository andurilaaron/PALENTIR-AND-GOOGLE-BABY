# Agent 03 — PostFX Effects Handoff

## What Changed

### New files (src/postfx/**)
- `src/postfx/PostFxEngine.ts` — Engine that manages Cesium PostProcessStage per mode
- `src/postfx/shaders/crt.glsl` — Green phosphor CRT with barrel distortion, scanlines, flicker
- `src/postfx/shaders/nvg.glsl` — Night vision with green monochrome, grain, circular vignette
- `src/postfx/shaders/thermal.glsl` — False-color thermal with heat ramp (black→blue→red→yellow→white)
- `src/postfx/index.ts` — Barrel export

### New files (src/ui/**)
- `src/ui/PostFxPanel.tsx` — Mode selector with 4 buttons (STD/CRT/NVG/THR)
- `src/ui/styles/postfx-panel.css` — Glassmorphic styling with color-coded active states

### No files modified outside lane

## How to Test
1. Integrator must wire PostFxEngine + PostFxPanel into App.tsx:
```typescript
import { createPostFxEngine } from "./postfx/index.ts";
import { PostFxPanel } from "./ui/PostFxPanel.tsx";

// After viewer is created:
const pfxEngine = createPostFxEngine(viewer);

// In JSX:
<PostFxPanel engine={pfxEngine} />
```
2. Click CRT → green scanline effect with barrel distortion
3. Click NVG → green night vision with grain noise
4. Click THR → thermal false-color heat map
5. Click STD → all effects removed, normal view

## Known Issues / Limitations
- Requires integrator wiring (by design — stays in lane)
- Shaders use Cesium's GLSL 3.0 conventions (out_FragColor, in v_textureCoordinates)
- Thermal ramp uses luminance as "heat" — not actual temperature data

## What NOT to Merge if Failing
- If shaders cause WebGL compilation errors
- If `npm run build` fails
