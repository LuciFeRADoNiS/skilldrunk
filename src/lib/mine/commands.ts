import { SKILLDRUNK_MENU } from "@/lib/owner/menu";

/** A ⌘K command — generated from the rail menu so nav + palette never drift. */
export interface MineCommand {
  id: string;
  label: string;
  group: string;
  href: string;
  external: boolean;
  icon?: string;
}

/** Flatten the grouped menu (items + their children) into a command list. */
export function buildCommands(): MineCommand[] {
  const cmds: MineCommand[] = [];
  for (const g of SKILLDRUNK_MENU.groups ?? []) {
    for (const it of g.items) {
      cmds.push({
        id: it.key,
        label: it.label,
        group: g.label,
        href: it.href,
        external: !!it.external,
        icon: it.icon,
      });
      for (const c of it.children ?? []) {
        cmds.push({
          id: `${it.key}-${c.key}`,
          label: `${it.label} · ${c.label}`,
          group: g.label,
          href: c.href,
          external: false,
          icon: it.icon,
        });
      }
    }
  }
  return cmds;
}
