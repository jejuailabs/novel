import Anthropic from "@anthropic-ai/sdk";
import type { NvMetric, MetricEventType } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { calculateCost } from "@/lib/tokens";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const MODELS = {
  sonnet: "claude-sonnet-4-20250514",
  haiku: "claude-haiku-4-20250414",
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
    system: opts.system,
    messages: opts.messages,
  });

  const duration = Date.now() - start;
  const text =
    response.content[0]?.type === "text" ? response.content[0].text : "";

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
    max_tokens: opts.maxTokens ?? 8192,
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
