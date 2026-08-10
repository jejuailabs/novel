import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaude, recordMetric } from "@/lib/anthropic";
import {
  PROMOTE_BIBLE_SYSTEM,
  buildPromoteBiblePrompt,
} from "@/prompts/phase1/promote-bible";

type BibleType = "concept" | "production" | "log";

interface PromotionEntry {
  bible_type: BibleType;
  section_path: string;
  operation: "append" | "update";
  content: string;
  reason: string;
}

const BIBLE_COLUMN_MAP: Record<BibleType, string> = {
  concept: "concept_bible",
  production: "production_bible",
  log: "creation_log",
};

function deepMergeAtPath(
  obj: Record<string, unknown>,
  path: string,
  content: string,
  operation: "append" | "update"
): Record<string, unknown> {
  const result = { ...obj };
  const keys = path.split(".");
  let current: Record<string, unknown> = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== "object") {
      current[key] = {};
    }
    current[key] = { ...(current[key] as Record<string, unknown>) };
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1];
  if (operation === "append" && typeof current[lastKey] === "string") {
    current[lastKey] = (current[lastKey] as string) + "\n" + content;
  } else {
    current[lastKey] = content;
  }

  return result;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, nodeId } = await req.json();

  // Fetch node
  const { data: node, error: nodeError } = await supabase
    .from("nv_nodes")
    .select("*")
    .eq("id", nodeId)
    .eq("project_id", projectId)
    .single();

  if (nodeError || !node) {
    return NextResponse.json({ error: "Node not found" }, { status: 404 });
  }

  // Fetch current bibles
  const { data: bible, error: bibleError } = await supabase
    .from("nv_bibles")
    .select("*")
    .eq("project_id", projectId)
    .single();

  if (bibleError || !bible) {
    return NextResponse.json({ error: "Bible not found" }, { status: 404 });
  }

  const currentBibleSummaries = [
    `[기획서]\n${JSON.stringify(bible.concept_bible ?? {}, null, 2)}`,
    `[제작 성경]\n${JSON.stringify(bible.production_bible ?? {}, null, 2)}`,
    `[창작 로그]\n${JSON.stringify(bible.creation_log ?? {}, null, 2)}`,
  ].join("\n\n");

  const nodeFullContent = [
    `제목: ${node.title}`,
    `번호: ${node.node_number}`,
    `태그: ${(node.tags ?? []).join(", ")}`,
    `내용:\n${node.content ?? ""}`,
  ].join("\n");

  // Call Claude
  const result = await callClaude({
    model: "haiku",
    system: PROMOTE_BIBLE_SYSTEM,
    messages: [
      {
        role: "user",
        content: buildPromoteBiblePrompt({
          currentBibleSummaries,
          nodeFullContent,
        }),
      },
    ],
    maxTokens: 4096,
  });

  await recordMetric(result, {
    projectId,
    eventType: "bible_promotion",
    entityId: nodeId,
  });

  // Parse response
  let entries: PromotionEntry[] = [];
  try {
    const cleaned = result.text.replace(/```json\n?|```/g, "").trim();
    entries = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse AI response", raw: result.text },
      { status: 500 }
    );
  }

  // Group entries by bible type and apply changes
  const updates: Record<string, Record<string, unknown>> = {};

  for (const entry of entries) {
    const column = BIBLE_COLUMN_MAP[entry.bible_type];
    if (!column) continue;

    const currentData = (updates[column] ??
      (bible[column as keyof typeof bible] as Record<string, unknown>) ??
      {}) as Record<string, unknown>;

    updates[column] = deepMergeAtPath(
      currentData,
      entry.section_path,
      entry.content,
      entry.operation
    );
  }

  // Update bibles in DB
  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from("nv_bibles")
      .update(updates)
      .eq("project_id", projectId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    entries,
    updated_bibles: Object.keys(updates),
  });
}
