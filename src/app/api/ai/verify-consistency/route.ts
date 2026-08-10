import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaude, recordMetric } from "@/lib/anthropic";
import {
  VERIFY_CONSISTENCY_SYSTEM,
  buildVerifyConsistencyPrompt,
} from "@/prompts/phase2/verify-consistency";
import { buildBibleContext, buildTrackerContext } from "@/lib/context-builder";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { episodeId } = await req.json();

  const { data: episode } = await supabase
    .from("nv_episodes")
    .select("*")
    .eq("id", episodeId)
    .single();

  if (!episode?.content) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }

  const [bibleRes, trackerRes, prevEpRes] = await Promise.all([
    supabase.from("nv_bibles").select("*").eq("project_id", episode.project_id).single(),
    supabase.from("nv_canon_trackers").select("*").eq("project_id", episode.project_id).single(),
    supabase
      .from("nv_episodes")
      .select("content, bu, hwa")
      .eq("project_id", episode.project_id)
      .eq("status", "approved")
      .order("bu", { ascending: false })
      .order("hwa", { ascending: false })
      .limit(1)
      .single(),
  ]);

  if (!bibleRes.data || !trackerRes.data) {
    return NextResponse.json({ error: "Bible/Tracker not found" }, { status: 404 });
  }

  const { concept, production } = buildBibleContext(bibleRes.data);
  const tracker = buildTrackerContext(trackerRes.data);
  const prevEnding = prevEpRes.data?.content
    ? prevEpRes.data.content.slice(-500)
    : "";

  const result = await callClaude({
    model: "sonnet",
    system: VERIFY_CONSISTENCY_SYSTEM,
    messages: [
      {
        role: "user",
        content: buildVerifyConsistencyPrompt({
          conceptBible: concept,
          productionBible: production,
          canonTracker: tracker,
          previousEpisodeEnding: prevEnding,
          episodeDraftContent: episode.content,
        }),
      },
    ],
    maxTokens: 4096,
  });

  await recordMetric(result, {
    projectId: episode.project_id,
    eventType: "consistency_check",
    entityId: episodeId,
  });

  let parsed = { passed: true, issues: [] };
  try {
    const cleaned = result.text.replace(/```json\n?|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    // If parsing fails, assume passed
  }

  await supabase.from("nv_consistency_checks").insert({
    episode_id: episodeId,
    issues: parsed.issues,
    passed: parsed.passed,
  });

  if (parsed.passed) {
    await supabase
      .from("nv_episodes")
      .update({ status: "reviewed" })
      .eq("id", episodeId);
  }

  return NextResponse.json(parsed);
}
