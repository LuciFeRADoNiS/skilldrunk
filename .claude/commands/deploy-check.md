---
name: deploy-check
description: Pre-deployment checklist
---

1. Run `npm run build` or `pnpm build` — check for errors
2. Run `npm run lint` — check for warnings
3. Check `git status` — no uncommitted changes
4. Check Vercel deployment status via MCP
5. Run CheckVibe scan on staging URL if available
6. Report: ready to deploy or blockers found
