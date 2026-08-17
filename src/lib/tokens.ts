const EXCHANGE_RATE = 1380;

const PRICING: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  // 2026-08-31까지 인트로 가격($2/$10), 이후 $3/$15
  "claude-sonnet-5": {
    input: 3.0 / 1_000_000,
    output: 15.0 / 1_000_000,
    cacheRead: 0.3 / 1_000_000,
    cacheWrite: 3.75 / 1_000_000,
  },
  "claude-haiku-4-5": {
    input: 1.0 / 1_000_000,
    output: 5.0 / 1_000_000,
    cacheRead: 0.1 / 1_000_000,
    cacheWrite: 1.25 / 1_000_000,
  },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number = 0,
  cacheWriteTokens: number = 0
): number {
  const p = PRICING[model];
  if (!p) return 0;

  const regularInput = inputTokens - cacheReadTokens - cacheWriteTokens;
  const usd =
    Math.max(0, regularInput) * p.input +
    outputTokens * p.output +
    cacheReadTokens * p.cacheRead +
    cacheWriteTokens * p.cacheWrite;

  return Math.round(usd * EXCHANGE_RATE * 100) / 100;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}
