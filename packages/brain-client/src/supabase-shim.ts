// Faz 4 §1.4 — pragmatic structural BrainSupabase (D-041, D-029 resolve).
//
// Supabase client's chainable builders (PostgrestFilterBuilder, etc.) aren't
// strict Promises — they're thenable but typescript's structural matcher
// rejects them against a strict Promise return. So we keep the *return*
// type permissive (any) and only enforce the *method shape* (presence of
// rpc/from/auth.getUser).
//
// Type identity is gone (any), but Faz 3 cross-repo dual-tree mismatch is
// also gone — that was the real goal. Compile-time discovery of typos
// inside brain-client survives (method names are spelled correctly), and
// the consumer code paths return typed BrainItem / etc. via `as` in
// each wrapper.

export interface BrainAuthClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getUser(): Promise<{ data: { user: { id: string; email?: string | null } | null }; error: any }>;
}

export interface BrainSupabase {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(fn: string, args?: Record<string, unknown>): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  auth: BrainAuthClient;
}
