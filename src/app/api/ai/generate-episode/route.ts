import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamClaude, MODELS, recordMetric } from "@/lib/anthropic";
import {
  GENERATE_EPISODE_SYSTEM,
  buildGenerateEpisodePrompt,
} from "@/prompts/phase2/generate-episode";
import { buildEpisodeContext } from "@/lib/context-builder";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { projectId, bu, hwa, synopsis } = await req.json();

  const [projectRes, bibleRes, trackerRes, episodesRes] = await Promise.all([
    supabase.from("nv_projects").select("*").eq("id", projectId).single(),
    supabase.from("nv_bibles").select("*").eq("project_id", projectId).single(),
    supabase.from("nv_canon_trackers").select("*").eq("project_id", projectId).single(),
    supabase
      .from("nv_episodes")
      .select("*")
      .eq("project_id", projectId)
      .eq("status", "approved")
      .order("bu", { ascending: false })
      .order("hwa", { ascending: false })
      .limit(5),
  ]);

  if (!projectRes.data || !bibleRes.data || !trackerRes.data) {
    return new Response("Project data not found", { status: 404 });
  }

  let { data: episode } = await supabase
    .from("nv_episodes")
    .select("*")
    .eq("project_id", projectId)
    .eq("bu", bu)
    .eq("hwa", hwa)
    .single();

  if (!episode) {
    const { data } = await supabase
      .from("nv_episodes")
      .insert({ project_id: projectId, bu, hwa, status: "streaming" })
      .select()
      .single();
    episode = data;
  } else {
    await supabase
      .from("nv_episodes")
      .update({ status: "streaming" })
      .eq("id", episode.id);
  }

  if (!episode) return new Response("Episode error", { status: 500 });

  const ctx = buildEpisodeContext(
    bibleRes.data,
    trackerRes.data,
    episodesRes.data ?? []
  );

  const userPrompt = buildGenerateEpisodePrompt({
    conceptBible: ctx.conceptBible,
    productionBible: ctx.productionBible,
    canonTracker: ctx.trackerContent,
    previousEpisodes: ctx.previousContent,
    bu,
    hwa,
    episodeSynopsis: synopsis,
    wordsTarget: 3000,
  });

  const stream = await streamClaude({
    model: "sonnet",
    system: [
      {
        type: "text",
        text: GENERATE_EPISODE_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 16000,
    stream: true,
  });

  const encoder = new TextEncoder();
  let fullText = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullText += event.delta.text;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            );
          }
        }

        const response = await stream.finalMessage();
        const wordCount = fullText.length;
        await supabase
          .from("nv_episodes")
          .update({
            content: fullText,
            word_count: wordCount,
            status: "draft",
          })
          .eq("id", episode!.id);

        const usage = response.usage;
        await recordMetric(
          {
            usage: {
              input_tokens: usage.input_tokens,
              output_tokens: usage.output_tokens,
              cache_read_input_tokens: (usage as unknown as Record<string, number>).cache_read_input_tokens ?? 0,
              cache_creation_input_tokens: (usage as unknown as Record<string, number>).cache_creation_input_tokens ?? 0,
            },
            duration: 0,
            model: MODELS.sonnet,
          },
          { projectId, eventType: "episode_gen", entityId: episode!.id }
        );

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, episodeId: episode!.id })}\n\n`
          )
        );
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
