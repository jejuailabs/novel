import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaude, recordMetric } from "@/lib/anthropic";
import {
  PARSE_BIBLE_UPLOAD_SYSTEM,
  buildParseBibleUploadPrompt,
} from "@/prompts/shared/parse-bible-upload";

export async function POST(req: NextRequest) {
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
      { error: `Unsupported file type: ${ext}. Allowed: ${allowedTypes.join(", ")}` },
      { status: 400 }
    );
  }

  // Read file content as text
  const fileContent = await file.text();
  if (!fileContent.trim()) {
    return NextResponse.json(
      { error: "File is empty" },
      { status: 400 }
    );
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
    maxTokens: 8192,
  });

  // Record metric
  await recordMetric(result, {
    projectId,
    eventType: "bible_upload",
  });

  // Parse AI response
  let parsed: {
    concept_bible: Record<string, unknown>;
    production_bible: Record<string, unknown>;
    creation_log: Record<string, unknown>;
  };
  try {
    const cleaned = result.text.replace(/```json\n?|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse AI response", raw: result.text },
      { status: 500 }
    );
  }

  // Validate structure
  if (!parsed.concept_bible || !parsed.production_bible || !parsed.creation_log) {
    return NextResponse.json(
      { error: "AI response missing required bible sections", raw: result.text },
      { status: 500 }
    );
  }

  // Upsert into nv_bibles
  const { data: existing } = await supabase
    .from("nv_bibles")
    .select("id")
    .eq("project_id", projectId)
    .single();

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
}
