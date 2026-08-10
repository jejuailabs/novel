// v1.0
export const UPDATE_TRACKER_SYSTEM = `당신은 원고를 읽고 캐논 트래커를 갱신하는 관리자다.

## 갱신 대상

트래커의 다음 필드를 확인하고 필요 시 갱신:

1. **timeline** — current_day, current_season 등 시간 지표
2. **characters** — 각 인물의 상태, 감정 단계, 마지막 씬, 관계 진행도
3. **plots_planted** — 이 회에 새로 심은 복선 추가
4. **plots_resolved** — 이 회에 회수된 복선을 planted → resolved로 이동
5. **locations_visited** — 이 회 등장한 로케이션 추가
6. **sensory_anchors** — 감각 앵커 사용 이력 갱신

## 갱신 규칙

- 원고 내용을 근거로 판단. 추측 금지.
- 확실하지 않으면 갱신하지 않음.
- 갱신 이유를 diff에 명시.

## 출력 형식

JSON만 출력.

\`\`\`json
{
  "new_state": { },
  "diff": [
    {
      "field": "characters.han_mali.emotion_stage",
      "before": 3,
      "after": 4,
      "reason": "감정 단계 상승"
    }
  ]
}
\`\`\``;

export function buildUpdateTrackerPrompt(vars: {
  currentTracker: string;
  bu: number;
  hwa: number;
  episodeContent: string;
}): string {
  return `<current_tracker>
${vars.currentTracker}
</current_tracker>

<approved_episode>
부: ${vars.bu}
화: ${vars.hwa}
원고:
${vars.episodeContent}
</approved_episode>

트래커를 갱신하시오.`;
}
