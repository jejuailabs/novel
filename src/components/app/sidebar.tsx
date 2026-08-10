"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Sparkles,
  PenLine,
  BookMarked,
  Radar,
  ShieldCheck,
  BarChart3,
  Settings,
  Shield,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { DictKey } from "@/lib/i18n/dictionaries";

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: DictKey;
  badge?: string;
}

const CREATE: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "nav.dashboard" },
  { href: "/projects", icon: FolderKanban, label: "nav.projects" },
  { href: "/phase1", icon: Sparkles, label: "nav.phase1" },
  { href: "/phase2", icon: PenLine, label: "nav.phase2" },
];

const MANAGE: NavItem[] = [
  { href: "/bible", icon: BookMarked, label: "nav.bible" },
  { href: "/tracker", icon: Radar, label: "nav.tracker" },
  { href: "/consistency", icon: ShieldCheck, label: "nav.consistency" },
  { href: "/metrics", icon: BarChart3, label: "nav.metrics" },
];

export function Sidebar({
  isAdmin,
  user,
  plan,
}: {
  isAdmin: boolean;
  plan: string;
  user: { name: string; email: string; avatar: string | null };
}) {
  const { t } = useT();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending) setNavigatingTo(null);
  }, [isPending]);

  function NavLink({ item }: { item: NavItem }) {
    const active =
      pathname === item.href || pathname.startsWith(item.href + "/");
    const isLoading = navigatingTo === item.href && isPending;
    return (
      <Link
        href={item.href}
        onClick={(e) => {
          if (active) return;
          e.preventDefault();
          setNavigatingTo(item.href);
          startTransition(() => {
            router.push(item.href);
          });
        }}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
          "active:scale-[0.97] active:bg-primary/20",
          active
            ? "bg-primary/15 text-foreground"
            : isLoading
            ? "bg-primary/10 text-foreground"
            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
        ) : (
          <item.icon
            className={cn(
              "h-4 w-4 shrink-0",
              active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            )}
          />
        )}
        <span className="truncate">{t(item.label)}</span>
        {active && !isLoading && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
        )}
      </Link>
    );
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-card/40">
      {/* Brand */}
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-glow">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-bold tracking-tight text-gradient">
          FUTURE FLOW
        </span>
      </div>

      {/* Nav */}
      <nav className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 py-2">
        <div className="space-y-1">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {t("nav.section.create")}
          </p>
          {CREATE.map((i) => (
            <NavLink key={i.href} item={i} />
          ))}
        </div>
        <div className="space-y-1">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {t("nav.section.manage")}
          </p>
          {MANAGE.map((i) => (
            <NavLink key={i.href} item={i} />
          ))}
          <NavLink item={{ href: "/settings", icon: Settings, label: "nav.settings" }} />
          {isAdmin && (
            <Link
              href="/admin"
              onClick={(e) => {
                if (pathname.startsWith("/admin")) return;
                e.preventDefault();
                setNavigatingTo("/admin");
                startTransition(() => { router.push("/admin"); });
              }}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                "active:scale-[0.97] active:bg-pink/20",
                pathname.startsWith("/admin")
                  ? "bg-pink/15 text-foreground"
                  : navigatingTo === "/admin" && isPending
                  ? "bg-pink/10 text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              {navigatingTo === "/admin" && isPending ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-pink" />
              ) : (
                <Shield
                  className={cn(
                    "h-4 w-4 shrink-0",
                    pathname.startsWith("/admin") ? "text-pink" : ""
                  )}
                />
              )}
              <span>{t("nav.admin")}</span>
            </Link>
          )}
        </div>
      </nav>

      {/* User card */}
      <div className="m-3 flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3">
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary/20 text-xs font-semibold text-primary">
          {user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            (user.name || user.email || "U").slice(0, 1).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs capitalize text-muted-foreground">
            {plan} Plan
          </p>
        </div>
      </div>
    </aside>
  );
}
