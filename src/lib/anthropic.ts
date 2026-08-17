import Anthropic from "@anthropic-ai/sdk";
import type { NvMetric, MetricEventType } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { calculateCost } from "@/lib/tokens";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const MODELS = {
  sonnet: "claude-sonnet-5",
  haiku: "claude-haiku-4-5",
} as const;

type ModelKey = keyof typeof MODELS;

interface CallOptions {
  model: ModelKey;
  system: Anthropic.MessageCreateParams["system"];
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
  stream?: false;
}

interface StreamOptions {
  model: ModelKey;
  system: Anthropic.MessageCreateParams["system"];
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
  stream: true;
}

interface MetricInput {
  projectId: string;
  eventType: MetricEventType;
  entityId?: string;
}

export async function callClaude(opts: CallOptions) {
  const start = Date.now();
  const response = await anthropic.messages.create({
    model: MODELS[opts.model],
    max_tokens: opts.maxTokens ?? 4096,
    // JSON 추출·판정용 유틸 호출이므로 thinking을 끈다.
    // (Sonnet 5는 기본이 adaptive thinking이라, 켜두면 응답 첫 블록이
    // thinking 블록이 되고 max_tokens도 thinking에 잠식된다.)
    thinking: { type: "disabled" },
    system: opts.system,
    messages: opts.messages,
  });

  const duration = Date.now() - start;
  // thinking 등 다른 블록이 섞여도 text 블록만 모아서 반환한다.
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return {
    text,
    usage: response.usage,
    duration,
    model: MODELS[opts.model],
  };
}

export async function streamClaude(opts: StreamOptions) {
  const stream = anthropic.messages.stream({
    model: MODELS[opts.model],
    // Sonnet 5는 adaptive thinking이 기본이고 max_tokens가 thinking까지
    // 포함하므로, 원고 본문이 잘리지 않게 여유를 둔다.
    max_tokens: opts.maxTokens ?? 16000,
    system: opts.system,
    messages: opts.messages,
  });

  return stream;
}

export async function recordMetric(
  result: {
    usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null };
    duration: number;
    model: string;
    text?: string;
  },
  meta: MetricInput
) {
  const supabase = await createClient();
  const costKrw = calculateCost(
    result.model,
    result.usage.input_tokens,
    result.usage.output_tokens,
    result.usage.cache_read_input_tokens ?? 0,
    result.usage.cache_creation_input_tokens ?? 0
  );

  await supabase.from("nv_metrics").insert({
    project_id: meta.projectId,
    event_type: meta.eventType,
    entity_id: meta.entityId ?? null,
    model: result.model,
    input_tokens: result.usage.input_tokens,
    output_tokens: result.usage.output_tokens,
    cache_read_tokens: result.usage.cache_read_input_tokens ?? 0,
    cache_write_tokens: result.usage.cache_creation_input_tokens ?? 0,
    cost_krw: costKrw,
    duration_ms: result.duration,
  } satisfies Omit<NvMetric, "id" | "created_at">);
}

export { anthropic };
