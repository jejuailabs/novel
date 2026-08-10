import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a KRW amount compactly (e.g. 8200 -> "8,200원"). */
export function formatKRW(v: number): string {
  return `${Math.round(v).toLocaleString("ko-KR")}원`;
}

/** Format a token count compactly (e.g. 745000 -> "745K"). */
export function formatTokens(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
  return String(v);
}
