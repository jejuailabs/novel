import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaude, recordMetric } from "@/lib/anthropic";
import {
  UPDATE_TRACKER_SYSTEM,
  buildUpdateTrackerPrompt,
} from "@/prompts/phase2/update-tracker";
import { buildTrackerContext } from "@/lib/context-builder";

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

  const { data: tracker } = await supabase
    .from("nv_canon_trackers")
    .select("*")
    .eq("project_id", episode.project_id)
    .single();

  if (!tracker) {
    return NextResponse.json({ error: "Tracker not found" }, { status: 404 });
  }

  const result = await callClaude({
    model: "haiku",
    system: UPDATE_TRACKER_SYSTEM,
    messages: [
      {
        role: "user",
        content: buildUpdateTrackerPrompt({
          currentTracker: buildTrackerContext(tracker),
          bu: episode.bu,
          hwa: episode.hwa,
          episodeContent: episode.content,
        }),
      },
    ],
    maxTokens: 4096,
  });

  await recordMetric(result, {
    projectId: episode.project_id,
    eventType: "tracker_update",
    entityId: episodeId,
  });

  let parsed = { new_state: tracker.state, diff: [] };
  try {
    const cleaned = result.text.replace(/```json\n?|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    // keep existing state if parsing fails
  }

  await supabase
    .from("nv_canon_trackers")
    .update({
      state: parsed.new_state,
      last_updated: new Date().toISOString(),
    })
    .eq("id", tracker.id);

  return NextResponse.json({ newState: parsed.new_state, diff: parsed.diff });
}
