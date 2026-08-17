import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamClaude, MODELS, recordMetric } from "@/lib/anthropic";
import {
  renderSystem,
  buildBrainstormUserPrompt,
} from "@/prompts/phase1/brainstorm";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { sessionId, message, projectId } = await req.json();

  const { data: project } = await supabase
    .from("nv_projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) return new Response("Project not found", { status: 404 });

  let session;
  if (sessionId) {
    const { data } = await supabase
      .from("nv_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();
    session = data;
  } else {
    const { data } = await supabase
      .from("nv_sessions")
      .insert({ project_id: projectId, session_type: "brainstorm" })
      .select()
      .single();
    session = data;
  }

  if (!session) return new Response("Session error", { status: 500 });

  await supabase
    .from("nv_messages")
    .insert({ session_id: session.id, role: "user", content: message });

  const { data: prevMessages } = await supabase
    .from("nv_messages")
    .select("role, content")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true })
    .limit(50);

  const { data: nodes } = await supabase
    .from("nv_nodes")
    .select("node_number, title, status")
    .eq("project_id", projectId);

  const nodesSummary =
    nodes?.map((n) => `${n.node_number} ${n.title} [${n.status}]`).join("\n") ??
    "";

  const history =
    prevMessages
      ?.slice(0, -1)
      .map((m) => `[${m.role}]: ${m.content}`)
      .join("\n\n") ?? "";

  const systemPrompt = renderSystem(session.session_type);
  const userPrompt = buildBrainstormUserPrompt({
    projectTitle: project.title,
    genre: project.genre,
    targetLength: project.target_length,
    existingNodesSummary: nodesSummary,
    previousMessages: history,
    newMessage: message,
  });

  const stream = await streamClaude({
    model: "sonnet",
    system: [
      { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 8192,
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

        await supabase
          .from("nv_messages")
          .insert({ session_id: session.id, role: "assistant", content: fullText });

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
          { projectId, eventType: "session_message", entityId: session.id }
        );

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, sessionId: session.id })}\n\n`
          )
        );
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: String(err) })}\n\n`
          )
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
