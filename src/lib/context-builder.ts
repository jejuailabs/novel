import { estimateTokens } from "./tokens";
import type { NvBible, NvCanonTracker, NvEpisode } from "@/types";

const MAX_INPUT_TOKENS = 150_000;

export interface Level1 {
  systemPrompt: string;
  bibleConceptSummary: string;
  bibleProductionSections: string[];
  canonTracker: string;
}

export interface Level2 {
  previousEpisodes: { hwa: number; content: string }[];
  relatedPlotSeeds: string[];
}

export interface Level3 {
  specificScenes: string[];
  specificCharacterHistory: string[];
}

export function buildBibleContext(bible: NvBible): { concept: string; production: string } {
  const concept = JSON.stringify(bible.concept_bible, null, 2);
  const production = JSON.stringify(bible.production_bible, null, 2);
  return { concept, production };
}

export function buildTrackerContext(tracker: NvCanonTracker): string {
  return JSON.stringify(tracker.state, null, 2);
}

export function buildPreviousEpisodesContext(
  episodes: NvEpisode[],
  maxTokenBudget: number = 30_000
): string {
  const sorted = [...episodes]
    .filter((e) => e.content && e.status === "approved")
    .sort((a, b) => {
      if (a.bu !== b.bu) return b.bu - a.bu;
      return b.hwa - a.hwa;
    });

  const parts: string[] = [];
  let used = 0;

  for (const ep of sorted) {
    if (!ep.content) continue;
    const tokens = estimateTokens(ep.content);
    if (used + tokens > maxTokenBudget) break;
    parts.unshift(`--- ${ep.bu}부 ${ep.hwa}화 ---\n${ep.content}`);
    used += tokens;
  }

  return parts.join("\n\n");
}

export function buildEpisodeContext(
  bible: NvBible,
  tracker: NvCanonTracker,
  previousEpisodes: NvEpisode[],
  maxTokens: number = MAX_INPUT_TOKENS
): {
  conceptBible: string;
  productionBible: string;
  trackerContent: string;
  previousContent: string;
} {
  const { concept, production } = buildBibleContext(bible);
  const trackerContent = buildTrackerContext(tracker);

  const level1Tokens =
    estimateTokens(concept) +
    estimateTokens(production) +
    estimateTokens(trackerContent);

  const remainingForEpisodes = Math.max(0, maxTokens - level1Tokens - 10_000);
  const previousContent = buildPreviousEpisodesContext(
    previousEpisodes,
    remainingForEpisodes
  );

  return {
    conceptBible: concept,
    productionBible: production,
    trackerContent,
    previousContent,
  };
}
