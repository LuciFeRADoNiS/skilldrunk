import type { ReactNode } from "react";

export interface MenuItem {
  key: string;
  label: string;
  href: string;
  icon?: string; // emoji or short symbol for v1; Lucide pluggable later
  children?: MenuItem[];
  badge?: string | number;
  external?: boolean; // open in a new tab (subdomain launchers); shows ↗
  dot?: "live" | "warn" | "off"; // small status indicator
  emptyStateCoach?: {
    message: string;
    actions?: Array<{ label: string; href: string }>;
  };
}

/** A labelled section of the rail (mono-kicker header + items). */
export interface MenuGroup {
  key: string;
  label: string;
  items: MenuItem[];
}

export interface MenuConfig {
  brand: { label: string; href: string };
  realmToggleHref?: string;
  /** Legacy flat list (admin app). Either `items` or `groups` must be set. */
  items?: MenuItem[];
  /** Grouped rail (skilldrunk Mine, design/01 §3). Takes precedence over items. */
  groups?: MenuGroup[];
  footer?: {
    avatarLabel: string;
    crossover?: { label: string; href: string };
  };
}

export interface OwnerLayoutProps {
  menu: MenuConfig;
  pathname: string;
  realm: "work" | "personal" | "shared";
  search?: ReactNode; // ⌘K trigger element (optional)
  notificationsBadge?: number;
  calendarBadge?: number;
  children: ReactNode;
}
