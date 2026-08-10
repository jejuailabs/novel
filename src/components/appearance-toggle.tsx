"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useLocaleStore } from "@/lib/i18n";
import { LOCALES, type Locale } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

/**
 * Unified appearance control: a dark/light toggle switch with the
 * multilingual (KO/EN) selector mounted right onto it, per the design.
 */
export function AppearanceToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 p-1",
        className
      )}
    >
      {/* Theme switch */}
      <button
        type="button"
        aria-label="Toggle theme"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="relative flex h-7 w-14 items-center rounded-full bg-background/70 px-1 transition-colors"
      >
        <span
          className={cn(
            "absolute flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition-transform duration-300",
            isDark ? "translate-x-0" : "translate-x-7"
          )}
        >
          {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
        </span>
        <Moon className="h-3 w-3 text-muted-foreground" />
        <Sun className="ml-auto h-3 w-3 text-muted-foreground" />
      </button>

      {/* Language selector mounted onto the same control */}
      <div className="flex items-center rounded-full bg-background/70 p-0.5">
        {LOCALES.map((l: Locale) => (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase transition-colors",
              (mounted ? locale : "ko") === l
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
