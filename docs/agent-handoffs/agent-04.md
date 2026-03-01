# Agent 04 — Shot Planner Handoff

## What Changed
- `src/features/shot-planner/ShotPlannerStore.ts` — localStorage CRUD for camera positions
- `src/features/shot-planner/ShotPlannerPanel.tsx` — UI with save/recall/delete
- `src/features/shot-planner/shot-planner.css` — glassmorphic panel styling
- `src/features/shot-planner/index.ts` — barrel export

## How to Test
1. Integrator adds `<ShotPlannerPanel />` to App.tsx inside ViewerProvider
2. Camera icon appears bottom-left
3. Click icon → panel opens
4. Click "+ Save" → current camera position saved
5. Click a saved shot → camera flies to that position (2 second animation)
6. Click ✕ → shot deleted
7. Reload page → shots persist via localStorage

## Known Issues / Limitations
- Shot names auto-increment ("Shot 1", "Shot 2") — no rename UI yet
- No screenshot thumbnails

## What NOT to Merge if Failing
- If build fails
- If localStorage causes errors
