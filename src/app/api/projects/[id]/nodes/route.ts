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
    .from("nv_nodes")
    .select("*")
    .eq("project_id", id)
    .order("node_number", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
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

  const { data: lastNode } = await supabase
    .from("nv_nodes")
    .select("node_number")
    .eq("project_id", id)
    .order("node_number", { ascending: false })
    .limit(1)
    .single();

  let nextNum = 1;
  if (lastNode?.node_number) {
    const m = lastNode.node_number.match(/N(\d+)/);
    if (m) nextNum = parseInt(m[1], 10) + 1;
  }

  const { data, error } = await supabase
    .from("nv_nodes")
    .insert({
      project_id: id,
      node_number: `N${String(nextNum).padStart(3, "0")}`,
      title: body.title,
      content: body.content ?? null,
      tags: body.tags ?? [],
      status: "진화중",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
