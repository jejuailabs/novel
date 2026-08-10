# FUTURE FLOW — webapp

AI-보조 IP 창작 웹앱. 키워드 하나에서 완결된 웹소설까지. (문서: `../docs/`)

## 스택

Next.js 14 (App Router) · TypeScript · Tailwind 3 · shadcn 스타일 UI · Supabase (Auth + Postgres) · Anthropic SDK · Zustand · React Query · next-themes.

## 로컬 실행

```bash
npm install
npm run dev
```

`.env.local`에 Supabase URL/anon 키가 이미 설정돼 있습니다. 서버 전용 키(`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`)는 필요 시 채웁니다.

## 데이터베이스 (중요)

이 Supabase 프로젝트(`dhtrjsequdqltftwsmsm`)는 **다른 앱과 공유**됩니다. 충돌을 피하기 위해 이 앱의 모든 테이블은 **`nv_` 접두사**를 씁니다 (`nv_projects`, `nv_nodes`, `nv_episodes`, `nv_profiles` …). `public.profiles` / `listings` / `renovations` 는 다른 앱 소유이므로 건드리지 않습니다.

- 사용자 프로필·역할: `nv_profiles` (role: `user` | `admin`)
- 모든 테이블 RLS 적용: 소유자 또는 관리자만 접근
- 관리자 판별: `public.nv_is_admin()`
- 신규 가입 시 `nv_profiles` 자동 생성 트리거 (`on_auth_user_created_novel`)
- 소유자 이메일(naggu1999@gmail.com)은 첫 로그인 시 자동 `admin`

## 구글 로그인 활성화

코드(로그인 화면·OAuth 콜백)는 완성돼 있고, Supabase 대시보드 설정만 남았습니다:

1. Google Cloud Console → OAuth 2.0 클라이언트 ID 생성
   - 승인된 리디렉션 URI: `https://dhtrjsequdqltftwsmsm.supabase.co/auth/v1/callback`
2. Supabase 대시보드 → Authentication → Providers → **Google** 활성화, 위 클라이언트 ID/Secret 입력
3. Authentication → URL Configuration → Redirect URLs에 로컬 주소 추가:
   `http://localhost:3000/**`, `http://localhost:3001/**`

이메일 매직 링크는 별도 설정 없이 동작합니다(Supabase 기본 메일, 발송량 제한 있음).

## 폴더 구조 (요약)

```
src/
├── app/
│   ├── (app)/            # 인증 필요 (dashboard, admin, phase1/2, bible …)
│   ├── login/            # 구글 + 매직링크 로그인
│   └── auth/callback     # OAuth 세션 교환
├── components/
│   ├── ui/               # shadcn 스타일 프리미티브
│   ├── app/              # 사이드바·탑바·유저메뉴
│   └── dashboard/        # FUTURE FLOW 대시보드
└── lib/
    ├── supabase/         # 브라우저·서버·미들웨어 클라이언트
    ├── i18n/             # ko/en 다국어
    └── auth.ts           # 세션·admin 가드
```

## 다국어 · 테마

우상단(및 탑바)의 **통합 토글**에 다크/라이트 스위치와 KO/EN 언어 선택이 함께 붙어 있습니다. 선택은 localStorage에 저장됩니다.

## 현재 범위 (Iteration 1+)

- [x] 인증(구글/매직링크) · 세션 · 미들웨어 가드
- [x] DB 스키마·RLS 전체 (`nv_*`)
- [x] 다크/라이트 + 다국어 통합 토글
- [x] FUTURE FLOW 대시보드 UI (노드·브레인스토밍·성경 미리보기 · 데모 데이터)
- [x] 어드민(회원 역할 관리 · 데이터 개요)
- [ ] Phase 1 브레인스토밍 스트리밍 (다음)
- [ ] Phase 2 원고 생성·트래커 (다음)
