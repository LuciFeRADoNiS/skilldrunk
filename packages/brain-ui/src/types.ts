import type { ReactNode } from "react";

export interface MenuItem {
  key: string;
  label: string;
  href: string;
  icon?: string; // emoji or short symbol for v1; Lucide pluggable later
  children?: MenuItem[];
  badge?: string | number;
  emptyStateCoach?: {
    message: string;
    actions?: Array<{ label: string; href: string }>;
  };
}

export interface MenuConfig {
  brand: { label: string; href: string };
  realmToggleHref?: string;
  items: MenuItem[];
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
