import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaude, recordMetric } from "@/lib/anthropic";
import {
  JUDGE_COMPLETION_SYSTEM,
  buildJudgeCompletionPrompt,
} from "@/prompts/phase1/judge-completion";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await req.json();

  const [projectRes, nodesRes, bibleRes] = await Promise.all([
    supabase.from("nv_projects").select("*").eq("id", projectId).single(),
    supabase.from("nv_nodes").select("*").eq("project_id", projectId),
    supabase.from("nv_bibles").select("*").eq("project_id", projectId).single(),
  ]);

  if (!projectRes.data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const project = projectRes.data;
  const nodes = nodesRes.data ?? [];

  const statusCounts: Record<string, number> = {};
  for (const n of nodes) {
    statusCounts[n.status] = (statusCounts[n.status] ?? 0) + 1;
  }

  const tagCounts: Record<string, number> = {};
  for (const n of nodes) {
    for (const tag of n.tags ?? []) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }

  const nodeStats = `총 노드: ${nodes.length}
상태별: ${Object.entries(statusCounts).map(([k, v]) => `${k}=${v}`).join(", ")}
태그별: ${Object.entries(tagCounts).map(([k, v]) => `${k}=${v}`).join(", ")}
확정 노드 목록: ${nodes.filter((n) => n.status === "확정").map((n) => `${n.node_number} ${n.title}`).join(", ")}`;

  const bibleSummary = bibleRes.data
    ? `기획서: ${JSON.stringify(bibleRes.data.concept_bible).slice(0, 2000)}
제작 성경: ${JSON.stringify(bibleRes.data.production_bible).slice(0, 2000)}
창작 로그: ${JSON.stringify(bibleRes.data.creation_log).slice(0, 1000)}`
    : "성경 없음";

  const pendingCount = nodes.filter(
    (n) => n.status === "진화중" || n.status === "보류"
  ).length;

  const userPrompt = buildJudgeCompletionPrompt({
    projectTitle: project.title,
    genre: project.genre,
    targetLength: project.target_length,
    nodeStatistics: nodeStats,
    bibleSummaries: bibleSummary,
    pendingDecisionCount: pendingCount,
  });

  const result = await callClaude({
    model: "haiku",
    system: [
      {
        type: "text",
        text: JUDGE_COMPLETION_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 2048,
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
    { projectId, eventType: "completion_judge" }
  );

  let judgment;
  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    judgment = jsonMatch ? JSON.parse(jsonMatch[0]) : { ready: false, score: 0, checks: [], gaps: ["파싱 실패"], recommendations: [] };
  } catch {
    judgment = { ready: false, score: 0, checks: [], gaps: ["응답 파싱 실패"], recommendations: [] };
  }

  return NextResponse.json(judgment);
}
