// Server-only re-exports (Faz 4 will add openai client + Claude synthesis here).
// Split entry so client bundles don't pull in server-only deps when the time comes.
export * from "./index";
