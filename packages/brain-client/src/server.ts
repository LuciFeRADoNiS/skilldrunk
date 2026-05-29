// Server-only exports — Faz 4 brain pipeline.
// Adds askBrainServer (real impl: OpenAI embed → vector search → Haiku stream)
// alongside the public client wrappers.

export * from "./index";
export { askBrainServer } from "./ask-brain-server";
export type { AskBrainServerOpts, AskBrainStreamChunk } from "./ask-brain-server";
