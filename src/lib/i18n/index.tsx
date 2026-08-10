"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createContext, useContext, useEffect } from "react";
import {
  dictionaries,
  type Locale,
  type DictKey,
  LOCALES,
} from "./dictionaries";

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggle: () => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: "ko",
      setLocale: (l) => set({ locale: l }),
      toggle: () =>
        set({ locale: get().locale === "ko" ? "en" : "ko" }),
    }),
    { name: "ff-locale" }
  )
);

const I18nContext = createContext<Locale>("ko");

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocaleStore((s) => s.locale);

  // Keep <html lang> in sync for a11y / SEO.
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return <I18nContext.Provider value={locale}>{children}</I18nContext.Provider>;
}

/** Translation hook. `t("dashboard.title")`, with `{name}` interpolation. */
export function useT() {
  const locale = useContext(I18nContext);
  const dict = dictionaries[locale] as Record<string, string>;

  function t(key: DictKey, vars?: Record<string, string | number>): string {
    let str = dict[key] ?? (key as string);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replaceAll(`{${k}}`, String(v));
      }
    }
    return str;
  }

  return { t, locale };
}

export { LOCALES };
export type { Locale };
