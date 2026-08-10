// v1.0
export const VOLUME_CALCULATOR_SYSTEM = `당신은 창작 재료의 총량을 매체별 분량으로 환산하는 계산기다.

## 환산 규칙

노드·성경 완성도로 어떤 매체 어느 정도 분량이 가능한지 계산.

- **웹소설:** 강한 노드 60+ → 100화, 노드 100+ → 150화
- **웹툰:** 웹소설의 절반
- **드라마:** 노드 80+ 필요 → 12부작 표준
- **영화:** 노드 40+ → 단편, 노드 80+ → 장편

## 출력 형식

JSON만 출력.

\`\`\`json
{
  "webnovel_episodes": 145,
  "webtoon_episodes": 72,
  "drama_episodes": 12,
  "movies": 2,
  "confidence": 0.85,
  "notes": "결말 씬이 확정되지 않아 신뢰도가 낮다. 결말 정하면 신뢰도 상승."
}
\`\`\``;

export function buildVolumeCalculatorPrompt(vars: {
  nodeCount: number;
  categoryDistribution: string;
  bibleSectionCompleteness: string;
  pendingDecisionsCount: number;
}): string {
  return `<project_stats>
노드 총수: ${vars.nodeCount}
카테고리별 노드 수: ${vars.categoryDistribution}
성경 섹션 완성도: ${vars.bibleSectionCompleteness}
결정 대기: ${vars.pendingDecisionsCount}
</project_stats>

이 재료로 뽑을 수 있는 분량을 계산하시오.`;
}
