import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 — FUTURE FLOW",
};

export default function PrivacyPage() {
  return (
    <article className="prose-sm space-y-6 text-foreground">
      <h1 className="text-2xl font-bold tracking-tight">개인정보처리방침</h1>
      <p className="text-sm text-muted-foreground">최종 수정일: 2025년 1월 1일</p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1. 수집하는 개인정보</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          서비스는 회원가입 및 서비스 제공을 위해 다음의 개인정보를 수집합니다: 이메일 주소, 이름(닉네임), 프로필 이미지. 서비스 이용 과정에서 IP 주소, 접속 로그, 서비스 이용 기록이 자동으로 생성되어 수집될 수 있습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">2. 개인정보의 이용 목적</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          수집된 개인정보는 서비스 제공 및 운영, 회원 관리, 서비스 개선 및 통계 분석, 고객 문의 대응의 목적으로 이용됩니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">3. 개인정보의 보유 및 파기</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          개인정보는 서비스 이용 기간 동안 보유되며, 회원 탈퇴 시 지체 없이 파기합니다. 단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">4. 개인정보의 제3자 제공</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          서비스는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 단, 법령에 의해 요구되는 경우는 예외로 합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">5. 이용자의 권리</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          이용자는 언제든지 자신의 개인정보를 조회, 수정, 삭제할 수 있으며, 개인정보 처리에 대한 동의를 철회할 수 있습니다. 관련 요청은 서비스 내 설정 페이지 또는 고객 지원을 통해 처리됩니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">6. 쿠키 사용</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          서비스는 인증 및 사용자 환경 설정 유지를 위해 쿠키를 사용합니다. 이용자는 브라우저 설정을 통해 쿠키 수집을 거부할 수 있으나, 이 경우 서비스 이용에 제한이 있을 수 있습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">7. 개인정보 보호책임자</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          개인정보 처리에 관한 문의사항은 서비스 내 고객 지원 채널을 통해 접수할 수 있습니다.
        </p>
      </section>
    </article>
  );
}
