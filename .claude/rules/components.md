---
globs: ["src/components/**/*"]
---

# Component Rules

- Use "use client" only when needed (state, effects, event handlers)
- Prefer server components for data fetching
- Use Tailwind classes, no inline styles
- Extract reusable logic into hooks (src/hooks/)
- Keep components under 150 lines — split if larger
- Use TypeScript interfaces for props, not inline types
