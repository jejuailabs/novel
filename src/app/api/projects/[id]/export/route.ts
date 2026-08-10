import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from("nv_projects")
    .select("id, title, genre, target_length")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    return new Response("Project not found", { status: 404 });
  }

  // Fetch approved/locked episodes
  const { data: episodes } = await supabase
    .from("nv_episodes")
    .select("bu, hwa, content")
    .eq("project_id", id)
    .in("status", ["approved", "locked"])
    .order("bu", { ascending: true })
    .order("hwa", { ascending: true });

  // Fetch bible
  const { data: bible } = await supabase
    .from("nv_bibles")
    .select("concept_bible, production_bible, creation_log")
    .eq("project_id", id)
    .single();

  // Build Markdown
  const lines: string[] = [];

  lines.push(`# ${project.title}`);
  lines.push("");
  if (project.genre) {
    lines.push(`> 장르: ${project.genre}`);
    lines.push("");
  }

  // Bible summary
  if (bible) {
    lines.push("---");
    lines.push("");
    lines.push("## 작품 설정 (Bible)");
    lines.push("");
    if (bible.concept_bible) {
      lines.push("### 컨셉 바이블");
      lines.push("");
      lines.push(bible.concept_bible);
      lines.push("");
    }
    if (bible.production_bible) {
      lines.push("### 프로덕션 바이블");
      lines.push("");
      lines.push(bible.production_bible);
      lines.push("");
    }
    if (bible.creation_log) {
      lines.push("### 창작 로그");
      lines.push("");
      lines.push(bible.creation_log);
      lines.push("");
    }
  }

  // Episodes
  if (episodes && episodes.length > 0) {
    lines.push("---");
    lines.push("");
    for (const ep of episodes) {
      lines.push(`## ${ep.bu}부 ${ep.hwa}화`);
      lines.push("");
      lines.push(ep.content ?? "");
      lines.push("");
    }
  }

  const markdown = lines.join("\n");
  const filename = `${project.title}.md`;

  return new Response(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
