import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: episode, error } = await supabase
    .from("nv_episodes")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 트래커 자동 갱신
  try {
    const origin = _req.headers.get("origin") || _req.nextUrl.origin;
    await fetch(`${origin}/api/ai/update-tracker`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: _req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({ episodeId: id }),
    });
  } catch {
    // 트래커 갱신 실패해도 승인은 유지
  }

  return NextResponse.json(episode);
}
