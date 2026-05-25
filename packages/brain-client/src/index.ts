// @skilldrunk/brain-client — Dual-Brain Web shared client.
// Faz 1 scope: typed wrappers around brain_* RPCs + tables.
// Consumers: skilldrunk apps (workspace alias), skimsoulfat-app (npm, after publish).

export { askBrain } from "./ask-brain";
export { fetchCatalog } from "./catalog";
export { fetchDashboard } from "./dashboard";
export { logActivity } from "./activity";
export { searchBrain } from "./search";
export { fetchInventory } from "./inventory";
export { archiveItem } from "./archive";

export type {
  Realm,
  Domain,
  BrainKind,
  BrainSource,
  BrainStatus,
  BrainItem,
  BrainActivity,
  BrainDigest,
  BrainKpi,
  DashboardPayload,
  InventoryReport,
} from "./types";
