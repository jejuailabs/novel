import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaude, recordMetric } from "@/lib/anthropic";
import {
  PARSE_BIBLE_UPLOAD_SYSTEM,
  buildParseBibleUploadPrompt,
} from "@/prompts/shared/parse-bible-upload";

// Claude가 34KB 문서를 Bible 3종으로 변환하는 데 시간이 오래 걸리므로
// Vercel 함수 타임아웃을 넉넉히 잡는다 (형제 AI 라우트와 동일한 정책).
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;

    if (!file || !projectId) {
      return NextResponse.json(
        { error: "file and projectId are required" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [".txt", ".md", ".json"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowedTypes.includes(ext)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${ext}. Allowed: ${allowedTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Read file content as text
    const fileContent = await file.text();
    if (!fileContent.trim()) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    // Call Claude to parse the document into bible structure
    const result = await callClaude({
      model: "sonnet",
      system: PARSE_BIBLE_UPLOAD_SYSTEM,
      messages: [
        {
          role: "user",
          content: buildParseBibleUploadPrompt(fileContent),
        },
      ],
      maxTokens: 16000,
    });

    if (!result.text.trim()) {
      return NextResponse.json(
        { error: "AI returned an empty response" },
        { status: 502 }
      );
    }

    // Record metric (best-effort: 메트릭 기록 실패가 변환 결과를 막지 않도록)
    try {
      await recordMetric(result, {
        projectId,
        eventType: "bible_upload",
      });
    } catch (metricErr) {
      console.error("[parse-bible-upload] recordMetric failed:", metricErr);
    }

    // Parse AI response
    let parsed: {
      concept_bible: Record<string, unknown>;
      production_bible: Record<string, unknown>;
      creation_log: Record<string, unknown>;
    };
    try {
      parsed = extractJson(result.text);
    } catch {
      console.error(
        "[parse-bible-upload] JSON parse failed. Raw response:",
        result.text.slice(0, 2000)
      );
      return NextResponse.json(
        {
          error:
            "AI 응답을 JSON으로 파싱하지 못했습니다. 응답이 잘렸을 수 있습니다.",
          raw: result.text.slice(0, 2000),
        },
        { status: 502 }
      );
    }

    // Validate structure
    if (
      !parsed.concept_bible ||
      !parsed.production_bible ||
      !parsed.creation_log
    ) {
      return NextResponse.json(
        { error: "AI response missing required bible sections", raw: result.text.slice(0, 2000) },
        { status: 502 }
      );
    }

    // Upsert into nv_bibles
    const { data: existing } = await supabase
      .from("nv_bibles")
      .select("id")
      .eq("project_id", projectId)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from("nv_bibles")
        .update({
          concept_bible: parsed.concept_bible,
          production_bible: parsed.production_bible,
          creation_log: parsed.creation_log,
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", projectId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase
        .from("nv_bibles")
        .insert({
          project_id: projectId,
          concept_bible: parsed.concept_bible,
          production_bible: parsed.production_bible,
          creation_log: parsed.creation_log,
        });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[parse-bible-upload] Unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// AI 응답에서 JSON 본문을 견고하게 추출한다.
// ```json 코드펜스, 앞뒤 잡텍스트가 섞여 있어도 첫 '{'~마지막 '}' 구간을 파싱한다.
function extractJson<T>(text: string): T {
  const cleaned = text.replace(/```json\n?|```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) {
      throw new Error("No JSON object found in response");
    }
    return JSON.parse(cleaned.slice(first, last + 1)) as T;
  }
}
