# AGENT 04 — SHOT PLANNER
**Branch:** `feat/shot-planner`
**Lane:** `src/features/shot-planner/**` ONLY

---

## Mission
Build a camera shot planner that lets users save, name, and recall camera positions on the globe. Useful for content creation — jump between preset locations instantly.

## Deliverables

### 1. ShotPlannerStore (`src/features/shot-planner/ShotPlannerStore.ts`)
- Manages a list of saved camera shots
- Each shot: `{ id, name, position: {lng, lat, height}, orientation: {heading, pitch, roll}, timestamp }`
- CRUD operations: `addShot()`, `removeShot(id)`, `getShots()`, `updateShot(id, partial)`
- `flyToShot(viewer, id)` — animates camera to saved position
- `captureCurrentShot(viewer, name)` — saves current camera state
- Persists to localStorage

### 2. ShotPlannerPanel (`src/features/shot-planner/ShotPlannerPanel.tsx`)
- List of saved shots with name and thumbnail placeholder
- "Capture" button — saves current camera position
- Click shot → fly to it
- Delete button per shot
- Positioned as a collapsible panel

### 3. Integration hook
- Export `useShotPlanner(viewer)` hook
- Returns shots list and action methods

## Acceptance Tests
- Capture current camera → appears in list
- Click saved shot → camera flies to position
- Delete shot → removed from list
- Survives page refresh (localStorage)
- `npm run build` passes

## Do-Not-Touch Boundaries
- Do NOT edit `src/core/**` (import types only)
- Do NOT edit `src/layers/**`
- Do NOT edit `src/App.tsx`
- Do NOT edit `src/ui/**` (beyond what's in your lane)

## File Structure
```
src/features/shot-planner/
├── ShotPlannerStore.ts
├── ShotPlannerPanel.tsx
├── types.ts
├── index.ts
└── AGENTS.md
```

## Handoff Note
Write: `docs/agent-handoffs/agent-04.md`
Include: what changed, how to test, known issues/limitations, what NOT to merge if failing
