"use client";

import { usePathname } from "next/navigation";
import { Topbar, type TopbarStats } from "@/components/app/topbar";
import { useT } from "@/lib/i18n";
import type { DictKey } from "@/lib/i18n/dictionaries";

const TITLE_MAP: { match: (p: string) => boolean; key: DictKey }[] = [
  { match: (p) => p.startsWith("/dashboard"), key: "dashboard.title" },
  { match: (p) => p.startsWith("/projects"), key: "nav.projects" },
  { match: (p) => p.startsWith("/phase1"), key: "nav.phase1" },
  { match: (p) => p.startsWith("/phase2"), key: "nav.phase2" },
  { match: (p) => p.startsWith("/bible"), key: "nav.bible" },
  { match: (p) => p.startsWith("/tracker"), key: "nav.tracker" },
  { match: (p) => p.startsWith("/consistency"), key: "nav.consistency" },
  { match: (p) => p.startsWith("/metrics"), key: "nav.metrics" },
  { match: (p) => p.startsWith("/settings"), key: "nav.settings" },
  { match: (p) => p.startsWith("/admin"), key: "admin.title" },
];

export function ShellHeader({
  stats,
  user,
  isAdmin,
}: {
  stats: TopbarStats;
  user: { name: string; email: string; avatar: string | null };
  isAdmin: boolean;
}) {
  const { t } = useT();
  const pathname = usePathname();
  const entry = TITLE_MAP.find((e) => e.match(pathname));
  const title = entry ? t(entry.key) : t("app.name");
  const subtitle = pathname.startsWith("/dashboard")
    ? "FUTURE FLOW"
    : undefined;

  return (
    <Topbar
      title={title}
      subtitle={subtitle}
      stats={stats}
      user={user}
      isAdmin={isAdmin}
    />
  );
}
