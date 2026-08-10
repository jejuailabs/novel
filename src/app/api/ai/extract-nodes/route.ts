import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaude, recordMetric } from "@/lib/anthropic";
import {
  EXTRACT_NODES_SYSTEM,
  buildExtractNodesPrompt,
} from "@/prompts/phase1/extract-nodes";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, projectId } = await req.json();

  const { data: existingNodes } = await supabase
    .from("nv_nodes")
    .select("title")
    .eq("project_id", projectId);

  const { data: recentMessages } = await supabase
    .from("nv_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(6);

  const existingTitles =
    existingNodes?.map((n) => n.title).join("\n") ?? "";
  const messagesText =
    recentMessages
      ?.reverse()
      .map((m) => `[${m.role}]: ${m.content}`)
      .join("\n\n") ?? "";

  const result = await callClaude({
    model: "haiku",
    system: EXTRACT_NODES_SYSTEM,
    messages: [
      {
        role: "user",
        content: buildExtractNodesPrompt({
          existingNodeTitles: existingTitles,
          newMessages: messagesText,
        }),
      },
    ],
    maxTokens: 2048,
  });

  await recordMetric(result, {
    projectId,
    eventType: "session_message",
    entityId: sessionId,
  });

  let candidates = [];
  try {
    const cleaned = result.text.replace(/```json\n?|```/g, "").trim();
    candidates = JSON.parse(cleaned);
  } catch {
    candidates = [];
  }

  if (candidates.length > 0) {
    const { data: lastNode } = await supabase
      .from("nv_nodes")
      .select("node_number")
      .eq("project_id", projectId)
      .order("node_number", { ascending: false })
      .limit(1)
      .single();

    let nextNum = 1;
    if (lastNode?.node_number) {
      const m = lastNode.node_number.match(/N(\d+)/);
      if (m) nextNum = parseInt(m[1], 10) + 1;
    }

    const inserts = candidates.map(
      (c: { title: string; content: string; tag_candidates: string[] }, i: number) => ({
        project_id: projectId,
        node_number: `N${String(nextNum + i).padStart(3, "0")}`,
        title: c.title,
        content: c.content,
        tags: c.tag_candidates ?? [],
        status: "진화중",
        session_id: sessionId,
      })
    );

    await supabase.from("nv_nodes").insert(inserts);
  }

  return NextResponse.json({ candidates });
}
