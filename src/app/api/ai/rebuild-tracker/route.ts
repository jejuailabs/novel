import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaude, recordMetric } from "@/lib/anthropic";
import {
  REBUILD_TRACKER_SYSTEM,
  buildRebuildTrackerPrompt,
} from "@/prompts/shared/rebuild-tracker";
import { estimateTokens } from "@/lib/tokens";
import type { NvEpisode } from "@/types";

// 원고 전체를 일괄 분석하므로 시간이 오래 걸린다 (형제 AI 라우트와 동일한 정책).
export const maxDuration = 120;

// 원고 컨텍스트 예산. 초과 시 최신 회차 우선으로 전문을 싣고,
// 오래된 회차는 앞부분 일부만 발췌해서 싣는다.
const EPISODE_TOKEN_BUDGET = 120_000;
const EXCERPT_CHARS = 1500;

function buildEpisodesContent(episodes: NvEpisode[]): string {
  // 최신 회차부터 예산을 배정하되, 출력은 시간순(오름차순)으로 조립한다.
  const desc = [...episodes].sort(
    (a, b) => b.bu - a.bu || b.hwa - a.hwa
  );

  const fullSet = new Set<string>();
  let used = 0;
  for (const ep of desc) {
    if (!ep.content) continue;
    const tokens = estimateTokens(ep.content);
    if (used + tokens > EPISODE_TOKEN_BUDGET) break;
    fullSet.add(ep.id);
    used += tokens;
  }

  const asc = [...episodes].sort((a, b) => a.bu - b.bu || a.hwa - b.hwa);
  return asc
    .filter((ep) => ep.content)
    .map((ep) => {
      const full = fullSet.has(ep.id);
      const body = full
        ? ep.content!
        : `${ep.content!.slice(0, EXCERPT_CHARS)}\n…(분량 제한으로 앞부분만 발췌)`;
      return `--- ${ep.bu}부 ${ep.hwa}화${full ? "" : " (발췌)"} ---\n${body}`;
    })
    .join("\n\n");
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const [projectRes, bibleRes, trackerRes, episodesRes] = await Promise.all([
      supabase
        .from("nv_projects")
        .select("id")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("nv_bibles").select("*").eq("project_id", projectId).maybeSingle(),
      supabase
        .from("nv_canon_trackers")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle(),
      supabase
        .from("nv_episodes")
        .select("*")
        .eq("project_id", projectId)
        .eq("status", "approved")
        .order("bu", { ascending: true })
        .order("hwa", { ascending: true }),
    ]);

    if (!projectRes.data) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (!trackerRes.data) {
      return NextResponse.json({ error: "Tracker not found" }, { status: 404 });
    }

    const episodes = (episodesRes.data ?? []).filter(
      (e: NvEpisode) => e.content
    );
    if (episodes.length === 0) {
      return NextResponse.json(
        { error: "분석할 승인된 원고가 없습니다. 먼저 원고를 업로드하세요." },
        { status: 400 }
      );
    }

    const episodeList = episodes
      .map((e: NvEpisode) => `${e.bu}부 ${e.hwa}화`)
      .join(", ");

    const result = await callClaude({
      model: "sonnet",
      system: REBUILD_TRACKER_SYSTEM,
      messages: [
        {
          role: "user",
          content: buildRebuildTrackerPrompt({
            conceptBible: JSON.stringify(
              bibleRes.data?.concept_bible ?? {},
              null,
              2
            ),
            episodeList,
            episodesContent: buildEpisodesContent(episodes),
          }),
        },
      ],
      maxTokens: 8192,
    });

    try {
      await recordMetric(result, {
        projectId,
        eventType: "tracker_update",
      });
    } catch (metricErr) {
      console.error("[rebuild-tracker] recordMetric failed:", metricErr);
    }

    let parsed: {
      new_state: Record<string, unknown>;
      summary?: string[];
    };
    try {
      parsed = extractJson(result.text);
    } catch {
      console.error(
        "[rebuild-tracker] JSON parse failed. Raw response:",
        result.text.slice(0, 2000)
      );
      return NextResponse.json(
        { error: "AI 응답을 JSON으로 파싱하지 못했습니다." },
        { status: 502 }
      );
    }

    if (!parsed.new_state || typeof parsed.new_state !== "object") {
      return NextResponse.json(
        { error: "AI 응답에 new_state가 없습니다." },
        { status: 502 }
      );
    }

    const { error: updateError } = await supabase
      .from("nv_canon_trackers")
      .update({
        state: parsed.new_state,
        last_updated: new Date().toISOString(),
      })
      .eq("id", trackerRes.data.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      newState: parsed.new_state,
      summary: parsed.summary ?? [],
      episodeCount: episodes.length,
    });
  } catch (err) {
    console.error("[rebuild-tracker] Unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// AI 응답에서 JSON 본문을 견고하게 추출한다 (parse-bible-upload와 동일한 정책).
function extractJson<T>(text: string): T {
  const cleaned = text.replace(/```json\n?|```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) {
      throw new Error("No JSON object found in response");
    }
    return JSON.parse(cleaned.slice(first, last + 1)) as T;
  }
}
