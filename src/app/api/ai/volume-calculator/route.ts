import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaude, recordMetric } from "@/lib/anthropic";
import {
  VOLUME_CALCULATOR_SYSTEM,
  buildVolumeCalculatorPrompt,
} from "@/prompts/shared/volume-calculator";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await req.json();

  const [nodesRes, bibleRes] = await Promise.all([
    supabase.from("nv_nodes").select("*").eq("project_id", projectId),
    supabase.from("nv_bibles").select("*").eq("project_id", projectId).single(),
  ]);

  const nodes = nodesRes.data ?? [];

  const tagCounts: Record<string, number> = {};
  for (const n of nodes) {
    for (const tag of n.tags ?? []) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }

  const bible = bibleRes.data;
  const bibleSections: string[] = [];
  if (bible) {
    const concept = bible.concept_bible as Record<string, unknown> | null;
    const production = bible.production_bible as Record<string, unknown> | null;
    if (concept) bibleSections.push(`기획서 섹션: ${Object.keys(concept).join(", ")}`);
    if (production) bibleSections.push(`제작 성경 섹션: ${Object.keys(production).join(", ")}`);
  }

  const pendingCount = nodes.filter(
    (n) => n.status === "진화중" || n.status === "보류"
  ).length;

  const userPrompt = buildVolumeCalculatorPrompt({
    nodeCount: nodes.length,
    categoryDistribution: Object.entries(tagCounts)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", "),
    bibleSectionCompleteness: bibleSections.join("\n") || "성경 없음",
    pendingDecisionsCount: pendingCount,
  });

  const result = await callClaude({
    model: "haiku",
    system: [
      {
        type: "text",
        text: VOLUME_CALCULATOR_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 1024,
  });

  await recordMetric(
    {
      usage: {
        input_tokens: result.usage.input_tokens,
        output_tokens: result.usage.output_tokens,
        cache_read_input_tokens:
          (result.usage as unknown as Record<string, number>).cache_read_input_tokens ?? 0,
        cache_creation_input_tokens:
          (result.usage as unknown as Record<string, number>).cache_creation_input_tokens ?? 0,
      },
      duration: result.duration,
      model: result.model,
    },
    { projectId, eventType: "volume_calc" }
  );

  let estimate;
  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    estimate = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    estimate = null;
  }

  return NextResponse.json(estimate ?? {
    webnovel_episodes: 0,
    webtoon_episodes: 0,
    drama_episodes: 0,
    movies: 0,
    confidence: 0,
    notes: "계산 실패",
  });
}
