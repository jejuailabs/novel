import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { Sparkles, PenLine, ShieldCheck, BarChart3, ArrowRight, ChevronRight } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "Phase 1 브레인스토밍",
    description: "키워드 하나로 세계관, 캐릭터, 플롯을 AI와 함께 확장합니다.",
  },
  {
    icon: PenLine,
    title: "Phase 2 원고 생성",
    description: "설정을 바탕으로 회차별 완결 원고를 자동 생성합니다.",
  },
  {
    icon: ShieldCheck,
    title: "일관성 검증",
    description: "성경과 트래커 기반으로 설정 오류를 자동 감지합니다.",
  },
  {
    icon: BarChart3,
    title: "실시간 토큰 대시보드",
    description: "토큰 사용량과 비용을 실시간으로 모니터링합니다.",
  },
];

const steps = [
  { number: "1", title: "키워드 입력", description: "장르와 소재 키워드를 입력하세요." },
  { number: "2", title: "AI 브레인스토밍", description: "AI가 세계관과 캐릭터를 확장합니다." },
  { number: "3", title: "완결 원고", description: "144화 분량의 웹소설을 완성합니다." },
];

export default async function Home() {
  const { user } = await getSessionProfile();

  return (
    <div className="min-h-dvh bg-app-gradient">
      {/* Hero */}
      <section className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-20 pt-28 text-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-glow">
          <Sparkles className="h-7 w-7 text-primary-foreground" />
        </div>

        <h1 className="text-gradient text-5xl font-extrabold tracking-tight sm:text-6xl">
          FUTURE FLOW
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted-foreground">
          키워드 하나에서 완결된 웹소설까지.
          <br />
          AI가 당신의 창작을 처음부터 끝까지 함께합니다.
        </p>

        <Link
          href={user ? "/dashboard" : "/login"}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          {user ? "대시보드로 이동" : "시작하기"}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="mb-10 text-center text-2xl font-bold tracking-tight text-foreground">
          핵심 기능
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card/70 p-6 shadow-card backdrop-blur-sm transition-colors hover:bg-card"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <f.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <h3 className="mb-1 text-base font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <h2 className="mb-10 text-center text-2xl font-bold tracking-tight text-foreground">
          이렇게 만듭니다
        </h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-2">
          {steps.map((s, i) => (
            <div key={s.number} className="flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:text-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-glow">
                {s.number}
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
              </div>
              {i < steps.length - 1 && (
                <ChevronRight className="ml-auto hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-8 sm:flex-row sm:justify-between">
          <span className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} FUTURE FLOW. All rights reserved.
          </span>
          <nav className="flex gap-6">
            <Link href="/legal/terms" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              이용약관
            </Link>
            <Link href="/legal/privacy" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              개인정보처리방침
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
