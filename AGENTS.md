# Global Guardrails (apply to all agents/tools)

- Only change files explicitly allowed by the task prompt (lane boundaries).
- Never edit or create .env* files. Never hardcode API keys. Never commit secrets.
- Do not touch package-lock.json unless the task explicitly requires dependency changes.
- No CDN script tags for Cesium or other core libraries. Use local assets only.
- Must keep the app runnable: npm run build must pass.
- Must write a handoff note to: docs/agent-handoffs/<agent-id>.md
