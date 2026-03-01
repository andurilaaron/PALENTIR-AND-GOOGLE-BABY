# AGENT GUARDRAILS (NON-NEGOTIABLE)

## 1) No secrets in code
- Never commit API keys.
- Keys are only read from environment variables (Vite uses `VITE_*`).
- No editing .env* files by agents.

## 2) Local-first assets
- No external CDN script tags for Cesium or other core libs.
- Cesium assets must remain served from `/public/cesium`.

## 3) Lane boundaries
- Each agent has an allowed folder ("Lane") and must not edit outside it.
- If something outside the lane is required, the agent must STOP and write a handoff note explaining what is needed.

## 4) Build gate
- `npm run build` must pass before merge.
- App must run at http://localhost:5173/

## 5) Handoff notes (mandatory)
- Each agent writes: `docs/agent-handoffs/<agent-id>.md`
- Include: summary, files changed, how to test, known issues.

## 6) Non-negotiable security baseline
- Keys only in `.env.local` / hosting env vars
- `.env.local` stays in `.gitignore`
- No CDN Cesium script tags
- No secrets committed, ever
