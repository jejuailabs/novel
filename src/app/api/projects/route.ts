import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("nv_projects")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, genre, target_length } = body;

  if (!title || !genre) {
    return NextResponse.json({ error: "title and genre required" }, { status: 400 });
  }

  const { data: project, error } = await supabase
    .from("nv_projects")
    .insert({ user_id: user.id, title, genre, target_length: target_length ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 성경과 트래커 초기화
  await Promise.all([
    supabase.from("nv_bibles").insert({ project_id: project.id }),
    supabase.from("nv_canon_trackers").insert({
      project_id: project.id,
      state: { timeline: {}, characters: {}, plots_planted: [], plots_resolved: [], locations_visited: [], sensory_anchors: {} },
    }),
  ]);

  return NextResponse.json(project, { status: 201 });
}
