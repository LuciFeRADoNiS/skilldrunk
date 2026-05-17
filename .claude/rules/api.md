---
globs: ["src/app/api/**/*", "src/actions/**/*"]
---

# API & Server Action Rules

- Always validate input with zod schemas
- Always check authentication before processing
- Return consistent error format: { error: string, code: number }
- Log errors with context (user_id, action, timestamp)
- Rate limit sensitive endpoints
- Never expose internal error details to client
