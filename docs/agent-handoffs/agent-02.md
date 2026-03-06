# Agent 02 — Google 3D Tiles Handoff

## What Changed

### New files (src/layers/tiles/**)
- `src/layers/tiles/GoogleTilesLayer.ts` — LayerPlugin that loads Google Photorealistic 3D Tiles
- `src/layers/tiles/index.ts` — barrel export

### No files modified outside lane

## How to Test

### With API key:
1. Create `.env.local` in project root: `VITE_GOOGLE_MAPS_KEY=your_key_here`
2. Restart dev server: `npm run dev`
3. The GoogleTilesLayer must be registered in App.tsx by the integrator (Agent 1)
4. Toggle "Google 3D Tiles" on → photorealistic tiles appear, default globe hides
5. Toggle off → default Cesium globe returns

### Without API key:
1. Remove or leave `.env.local` empty
2. Toggle on → status shows "error", console warns about missing key
3. Default Cesium globe continues to work normally

### Integration note:
The integrator (Agent 1 or App.tsx) needs to register this layer:
```typescript
import { GoogleTilesLayer } from "./layers/tiles/index.ts";
LayerRegistry.register(new GoogleTilesLayer());
```

## Known Issues / Limitations
- Requires integrator to register the layer (by design — stays in lane)
- Google 3D Tiles requires a valid Google Maps API key with Map Tiles API enabled
- Large data volume — 3D tiles can use significant bandwidth
- `maximumScreenSpaceError: 8` balances quality vs performance

## What NOT to Merge if Failing
- If `npm run build` fails
- If importing GoogleTilesLayer causes runtime errors
- If the layer doesn't gracefully degrade without a key
