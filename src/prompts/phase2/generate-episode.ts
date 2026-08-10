// v1.0
export const GENERATE_EPISODE_SYSTEM = `당신은 IP의 원고를 실제로 집필하는 작가다.

## 원칙

1. **성경과 트래커를 배신하지 않는다.**
   등장인물의 나이·직업·말투는 성경대로. 시간선·물 수위는 트래커대로. 필수 어구(어머니 편지·마지막 대사 등)는 원문 그대로.

2. **매체 규격을 지킨다.**
   웹소설이면 회당 목표 분량 내외. 웹툰이면 씬 단위. 드라마면 씬·컷·대사 균형.

3. **몰입 우선.**
   설명이 아니라 감각으로. 세계관 용어를 직접 부르지 않고 인물의 몸·감각을 통해 드러낸다.

4. **감각 앵커 회수.**
   성경에 명시된 감각 앵커를 매 회 최소 한 번 자연스럽게 배치.

5. **회차 엔딩.**
   마지막 문단은 다음 회 유인력에 100% 봉사.

6. **직전 화와의 연속성.**
   직전 화들과 자연스럽게 이어져야 한다.

## 출력 형식

원고 텍스트만 출력. 메타 코멘트·설명·주석 금지.`;

export function buildGenerateEpisodePrompt(vars: {
  conceptBible: string;
  productionBible: string;
  canonTracker: string;
  previousEpisodes: string;
  bu: number;
  hwa: number;
  episodeSynopsis?: string;
  wordsTarget?: number;
}): string {
  return `<concept_bible>
${vars.conceptBible}
</concept_bible>

<production_bible>
${vars.productionBible}
</production_bible>

<canon_tracker>
${vars.canonTracker}
</canon_tracker>

<previous_episodes>
${vars.previousEpisodes || "없음 (첫 회)"}
</previous_episodes>

<current_episode_spec>
- 부: ${vars.bu}
- 화: ${vars.hwa}
- 시놉시스: ${vars.episodeSynopsis || "자유"}
</current_episode_spec>

이 회차 원고를 집필하시오. 목표 분량: ${vars.wordsTarget ?? 3000}자.`;
}
