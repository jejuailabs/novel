"use client";

import { Coins, BookOpen, Wallet } from "lucide-react";
import { AppearanceToggle } from "@/components/appearance-toggle";
import { UserMenu } from "@/components/app/user-menu";
import { ProjectSwitcher } from "@/components/app/project-switcher";
import { formatKRW, formatTokens } from "@/lib/utils";

export interface TopbarStats {
  tokens: number;
  costKrw: number;
  episodesDone: number;
  episodesTotal: number;
}

export function Topbar({
  title,
  subtitle,
  stats,
  user,
  isAdmin,
}: {
  title: string;
  subtitle?: string;
  stats: TopbarStats;
  user: { name: string; email: string; avatar: string | null };
  isAdmin: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/70 px-6 backdrop-blur">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold">{title}</h1>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <ProjectSwitcher />

      <div className="ml-auto flex items-center gap-2">
        <Stat icon={<Coins className="h-3.5 w-3.5 text-cyan" />} value={formatTokens(stats.tokens)} />
        <Stat
          icon={<BookOpen className="h-3.5 w-3.5 text-violet" />}
          value={`${stats.episodesDone} / ${stats.episodesTotal}화`}
        />
        <Stat icon={<Wallet className="h-3.5 w-3.5 text-teal" />} value={formatKRW(stats.costKrw)} />

        <div className="mx-1 h-6 w-px bg-border" />

        <AppearanceToggle />
        <UserMenu
          name={user.name}
          email={user.email}
          avatar={user.avatar}
          isAdmin={isAdmin}
        />
      </div>
    </header>
  );
}

function Stat({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="hidden items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium sm:flex">
      {icon}
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
