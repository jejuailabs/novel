import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관 — FUTURE FLOW",
};

export default function TermsPage() {
  return (
    <article className="prose-sm space-y-6 text-foreground">
      <h1 className="text-2xl font-bold tracking-tight">이용약관</h1>
      <p className="text-sm text-muted-foreground">최종 수정일: 2025년 1월 1일</p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제1조 (목적)</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          이 약관은 FUTURE FLOW(이하 &quot;서비스&quot;)가 제공하는 AI 기반 웹소설 창작 서비스의 이용과 관련하여 서비스와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제2조 (정의)</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          &quot;서비스&quot;란 FUTURE FLOW가 제공하는 AI 보조 창작 도구 및 관련 부가 서비스를 의미합니다. &quot;이용자&quot;란 서비스에 접속하여 이 약관에 따라 서비스를 이용하는 회원을 의미합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제3조 (서비스의 제공)</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          서비스는 AI 기반 브레인스토밍, 원고 생성, 일관성 검증, 토큰 사용량 모니터링 등의 기능을 제공합니다. 서비스의 세부 내용은 사전 고지 후 변경될 수 있습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제4조 (이용자의 의무)</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          이용자는 서비스 이용 시 관련 법령 및 이 약관을 준수해야 합니다. 타인의 개인정보를 부정하게 사용하거나, 서비스의 정상적인 운영을 방해하는 행위를 해서는 안 됩니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제5조 (지적재산권)</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          이용자가 서비스를 통해 생성한 창작물의 저작권은 이용자에게 귀속됩니다. 단, 서비스 운영에 필요한 범위 내에서 서비스는 해당 콘텐츠를 이용할 수 있습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제6조 (면책 조항)</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          서비스는 AI 생성 콘텐츠의 정확성, 완전성, 적합성에 대해 보증하지 않습니다. 천재지변 또는 불가항력으로 인한 서비스 중단에 대해 책임을 지지 않습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제7조 (약관의 변경)</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          서비스는 필요한 경우 이 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지를 통해 효력이 발생합니다.
        </p>
      </section>
    </article>
  );
}
