import { NextRequest, NextResponse } from "next/server";
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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get the bible for this project
  const { data: bible, error: bibleErr } = await supabase
    .from("nv_bibles")
    .select("id")
    .eq("project_id", id)
    .single();

  if (bibleErr) return NextResponse.json({ error: bibleErr.message }, { status: 404 });

  // Get revisions ordered by version desc
  const { data: revisions, error } = await supabase
    .from("nv_bible_revisions")
    .select("id, version, change_summary, created_at, snapshot")
    .eq("bible_id", bible.id)
    .order("version", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(revisions ?? []);
}
