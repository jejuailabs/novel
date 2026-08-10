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

  const { data, error } = await supabase
    .from("nv_bibles")
    .select("*")
    .eq("project_id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { bible_type, content, change_summary } = body;

  const updateField =
    bible_type === "concept"
      ? "concept_bible"
      : bible_type === "production"
      ? "production_bible"
      : "creation_log";

  // Fetch current bible state before updating
  const { data: currentBible, error: fetchErr } = await supabase
    .from("nv_bibles")
    .select("*")
    .eq("project_id", id)
    .single();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 404 });

  // Determine next version number
  const { data: maxVersionRow } = await supabase
    .from("nv_bible_revisions")
    .select("version")
    .eq("bible_id", currentBible.id)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  const nextVersion = (maxVersionRow?.version ?? 0) + 1;

  // Save current state as a revision
  const snapshot = {
    concept_bible: currentBible.concept_bible,
    production_bible: currentBible.production_bible,
    creation_log: currentBible.creation_log,
  };

  const { error: revisionErr } = await supabase
    .from("nv_bible_revisions")
    .insert({
      bible_id: currentBible.id,
      version: nextVersion,
      snapshot,
      change_summary: change_summary ?? null,
    });

  if (revisionErr) return NextResponse.json({ error: revisionErr.message }, { status: 500 });

  // Perform the update
  const { data, error } = await supabase
    .from("nv_bibles")
    .update({
      [updateField]: content,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
