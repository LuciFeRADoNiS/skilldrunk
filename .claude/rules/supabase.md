---
globs: ["src/lib/supabase/**/*", "supabase/**/*"]
---

# Supabase Rules

- Use createAnonClient() for public data (ISR-compatible)
- Use createClient() (cookie-based) only for auth-required operations
- Always enable RLS on new tables
- Write RLS policies before inserting data
- Use service_role key only in server actions, never in client code
- Project ref: vrgohatarieeguyyhfan
