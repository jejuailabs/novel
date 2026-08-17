import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 기존 원고 파일(.txt/.md)을 여러 개 받아 approved 에피소드로 삽입한다.
// 부/화 번호는 파일명에서 파싱하고, 파싱 실패 시 기존 마지막 회차 뒤에 순서대로 붙인다.
export const maxDuration = 60;

const ALLOWED_EXTS = [".txt", ".md"];

interface ParsedName {
  bu: number | null;
  hwa: number | null;
}

// 파일명에서 부/화를 추출한다. 지원 패턴:
//   "1부_3화", "1부 3화", "1-3", "3화", "ep3", "episode_3", "003"
function parseEpisodeNumber(filename: string): ParsedName {
  const base = filename.replace(/\.[^.]+$/, "");

  const buHwa = base.match(/(\d+)\s*부[\s_\-.]*(\d+)\s*화/);
  if (buHwa) return { bu: parseInt(buHwa[1]), hwa: parseInt(buHwa[2]) };

  const dashPair = base.match(/^(\d+)\s*[-_.]\s*(\d+)$/);
  if (dashPair) return { bu: parseInt(dashPair[1]), hwa: parseInt(dashPair[2]) };

  const hwaOnly = base.match(/(\d+)\s*화/);
  if (hwaOnly) return { bu: null, hwa: parseInt(hwaOnly[1]) };

  const ep = base.match(/ep(?:isode)?[\s_\-.]*(\d+)/i);
  if (ep) return { bu: null, hwa: parseInt(ep[1]) };

  const numOnly = base.match(/(\d+)/);
  if (numOnly) return { bu: null, hwa: parseInt(numOnly[1]) };

  return { bu: null, hwa: null };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 소유권 확인
    const { data: project } = await supabase
      .from("nv_projects")
      .select("id, user_id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!project)
      return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const formData = await req.formData();
    const files = formData
      .getAll("files")
      .filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "files are required" },
        { status: 400 }
      );
    }

    for (const file of files) {
      const ext = file.name
        .substring(file.name.lastIndexOf("."))
        .toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) {
        return NextResponse.json(
          {
            error: `지원하지 않는 파일 형식입니다: ${file.name} (허용: ${ALLOWED_EXTS.join(", ")})`,
          },
          { status: 400 }
        );
      }
    }

    // 기존 에피소드 목록 (중복 판정 + 순번 배정용)
    const { data: existing } = await supabase
      .from("nv_episodes")
      .select("id, bu, hwa")
      .eq("project_id", projectId);

    const existingMap = new Map<string, string>();
    let maxBu = 1;
    let maxHwa = 0;
    for (const ep of existing ?? []) {
      existingMap.set(`${ep.bu}-${ep.hwa}`, ep.id);
      if (ep.bu > maxBu || (ep.bu === maxBu && ep.hwa > maxHwa)) {
        maxBu = ep.bu;
        maxHwa = ep.hwa;
      }
    }

    // 파일명 파싱 → 정렬 → 번호 없는 파일은 뒤에 순서대로
    const parsed = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        content: (await file.text()).trim(),
        ...parseEpisodeNumber(file.name),
      }))
    );

    const empty = parsed.filter((p) => !p.content);
    if (empty.length > 0) {
      return NextResponse.json(
        { error: `빈 파일이 있습니다: ${empty.map((p) => p.name).join(", ")}` },
        { status: 400 }
      );
    }

    const withNumber = parsed
      .filter((p) => p.hwa !== null)
      .sort((a, b) => (a.bu ?? 1) - (b.bu ?? 1) || a.hwa! - b.hwa!);
    const withoutNumber = parsed.filter((p) => p.hwa === null);

    let nextHwa = maxHwa;
    const rows = [
      ...withNumber.map((p) => ({
        name: p.name,
        bu: p.bu ?? 1,
        hwa: p.hwa!,
        content: p.content,
      })),
      ...withoutNumber.map((p) => ({
        name: p.name,
        bu: maxBu,
        hwa: ++nextHwa,
        content: p.content,
      })),
    ];

    // 배치 내 중복 부/화 검사
    const seen = new Set<string>();
    for (const row of rows) {
      const key = `${row.bu}-${row.hwa}`;
      if (seen.has(key)) {
        return NextResponse.json(
          {
            error: `같은 회차(${row.bu}부 ${row.hwa}화)를 가리키는 파일이 2개 이상입니다. 파일명을 확인하세요.`,
          },
          { status: 400 }
        );
      }
      seen.add(key);
    }

    const now = new Date().toISOString();
    const imported: { bu: number; hwa: number; name: string; updated: boolean }[] =
      [];

    for (const row of rows) {
      const key = `${row.bu}-${row.hwa}`;
      const existingId = existingMap.get(key);

      if (existingId) {
        const { error } = await supabase
          .from("nv_episodes")
          .update({
            content: row.content,
            word_count: row.content.length,
            status: "approved",
            approved_at: now,
          })
          .eq("id", existingId);
        if (error)
          return NextResponse.json({ error: error.message }, { status: 500 });
        imported.push({ bu: row.bu, hwa: row.hwa, name: row.name, updated: true });
      } else {
        const { error } = await supabase.from("nv_episodes").insert({
          project_id: projectId,
          bu: row.bu,
          hwa: row.hwa,
          content: row.content,
          word_count: row.content.length,
          status: "approved",
          approved_at: now,
        });
        if (error)
          return NextResponse.json({ error: error.message }, { status: 500 });
        imported.push({ bu: row.bu, hwa: row.hwa, name: row.name, updated: false });
      }
    }

    return NextResponse.json({ imported, count: imported.length });
  } catch (err) {
    console.error("[episodes/import] Unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
