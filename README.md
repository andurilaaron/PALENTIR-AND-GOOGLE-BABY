# Palentir

> Real-time geospatial intelligence dashboard — "What if Google Earth and Palantir had a baby"

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Copy Cesium assets (runs automatically via postinstall)
```bash
npm run postinstall
```

### 3. Create `.env.local` (LOCAL ONLY — never commit this)
```bash
VITE_GOOGLE_MAPS_KEY=YOUR_GOOGLE_MAPS_API_KEY_HERE
```

### 4. Start dev server
```bash
npm run dev
```

### 5. Open http://localhost:5173

## Architecture

### Agent-per-Branch Model
Each feature is developed by a dedicated agent on its own branch. Agents must stay within their assigned folder ("lane") and must not touch files outside their scope.

| Agent | Branch | Lane |
|-------|--------|------|
| 0 | `main` | Project scaffold |
| 1 | `chore/core-architecture` | `src/core/**`, `src/ui/LayerPanel.tsx` |
| 2 | `feat/tiles-base-layer` | `src/layers/tiles/**` |
| 3 | `feat/postfx` | `src/postfx/**`, `src/ui/PostFxPanel.tsx` |
| 4 | `feat/shot-planner` | `src/features/shot-planner/**` |
| 5 | `feat/satellites` | `src/layers/satellites/**` |
| 6 | `feat/flights` | `src/layers/flights/**` |
| 7 | `feat/earthquakes-traffic` | `src/layers/earthquakes/**`, `src/layers/traffic/**` |
| 8 | `feat/cctv` | `src/layers/cctv/**` |

### Security Rules
- API keys ONLY in `.env.local` (never committed)
- No CDN script tags for Cesium
- `.env.local` is in `.gitignore` via `*.local` pattern
- Rotate any exposed keys immediately

### Agent Docs
- Task definitions: `docs/agents/AGENT_XX_*.md`
- Handoff notes: `docs/agent-handoffs/agent-XX.md`
- Guardrails: `docs/AGENT_GUARDRAILS.md`
