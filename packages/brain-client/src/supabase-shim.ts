// Minimal Supabase interface so brain-client doesn't pin a specific
// @supabase/supabase-js *instance* into its public API. Cross-repo
// consumers (skimsoulfat-app while file: linked in Faz 3, third parties
// later) may have their own supabase-js version — TypeScript identity
// would otherwise mismatch. After npm-publish the registry guarantees a
// single instance and the typed-as-any cost is moot.
//
// Faz 4 candidate: replace with structural type that matches both
// chained query builders and the rpc() PostgrestFilterBuilder.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BrainSupabase = any;
