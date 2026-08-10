/**
 * Placeholder content for the dashboard preview shown before a project has
 * real Phase 1 data. Replaced by live Supabase queries once brainstorming
 * sessions produce nodes (Iteration 2+).
 */

export type NodeStatus = "확정" | "진화중" | "보류" | "폐기";

export interface DemoNode {
  number: string;
  title: string;
  status: NodeStatus;
  tags: number;
}

export const DEMO_NODES: DemoNode[] = [
  { number: "N001", title: "제주를 거부하려는 여자", status: "확정", tags: 5 },
  { number: "N014", title: "거미를 읽은 남자", status: "확정", tags: 3 },
  { number: "N022", title: "밀물처럼 계절이 온다", status: "진화중", tags: 4 },
  { number: "N031", title: "세계관", status: "확정", tags: 12 },
  { number: "N037", title: "로케이션", status: "진화중", tags: 8 },
  { number: "N042", title: "감각 앵커", status: "보류", tags: 6 },
  { number: "N048", title: "복선 · 백록담의 물", status: "진화중", tags: 2 },
];

export interface DemoMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
}

export const DEMO_MESSAGES: DemoMessage[] = [
  {
    id: "m1",
    role: "assistant",
    content:
      "그렇게 제주라는 장소를 잃은 여자. 행복했던 기억이 상처가 되는, 모든 계절이 시작되는 이유였네요.",
    time: "14:42",
  },
  {
    id: "m2",
    role: "user",
    content: "좋아, 더 확장해줘.",
    time: "14:43",
  },
  {
    id: "m3",
    role: "assistant",
    content:
      "거부는 사실 스스로를 보호하기 위한 거짓말일 수 있어요. 그녀는 제주를 떠나서 적적하면, 무의식은 자꾸 그 곳으로 자신을 이끕니다.",
    time: "14:43",
  },
];

export const DEMO_SUGGESTIONS = [
  "이 방향 좋아",
  "반대 방향은?",
  "다른 데뷔이션",
  "구현 방식 확장",
];

export const DEMO_CHARACTER =
  "마리. 삶의 제주를 거부하는 여자. 겉으로는 무심하지만, 제주에 깊은 상처를 숨기고 있다.";

export const DEMO_PRINCIPLES = [
  "1. 감정은 계절을 탄다.",
  "2. 기억은 장소에 산다.",
  "3. 진실은 언제나 바다 건너에 있다.",
];

export const DEMO_PROGRESS = { value: 78, done: 42, total: 90 };
