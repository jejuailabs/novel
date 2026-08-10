"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Mail } from "lucide-react";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.85 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.67-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.67 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

export function LoginForm() {
  const { t } = useT();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState<"google" | "email" | null>(null);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(
    params.get("error") ? "auth" : null
  );

  const supabase = React.useMemo(() => createClient(), []);
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : undefined;

  async function signInGoogle() {
    setLoading("google");
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setError(error.message);
      setLoading(null);
    }
  }

  async function signInEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading("email");
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(null);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <Card className="animate-fade-in glass">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{t("auth.welcome")}</h1>
          <p className="text-sm text-muted-foreground">{t("auth.subtitle")}</p>
        </div>

        <Button
          onClick={signInGoogle}
          disabled={loading !== null}
          variant="secondary"
          size="lg"
          className="w-full bg-background text-foreground hover:bg-background/80"
        >
          {loading === "google" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          {t("action.signInGoogle")}
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">
            {t("auth.orEmail")}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {sent ? (
          <div className="flex items-center gap-2 rounded-lg bg-teal/10 px-3 py-3 text-sm text-teal">
            <Mail className="h-4 w-4" />
            {t("auth.emailSent")}
          </div>
        ) : (
          <form onSubmit={signInEmail} className="space-y-3">
            <Input
              type="email"
              required
              placeholder={t("auth.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              type="submit"
              disabled={loading !== null}
              className="w-full"
            >
              {loading === "email" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {t("auth.sendLink")}
            </Button>
          </form>
        )}

        {error && (
          <p className="text-sm text-destructive">
            {error === "auth"
              ? "인증에 실패했습니다. 다시 시도해 주세요."
              : error}
          </p>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {t("auth.terms")}
        </p>
      </CardContent>
    </Card>
  );
}
