import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { AppearanceToggle } from "@/components/appearance-toggle";
import { Sparkles } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="relative min-h-dvh bg-app-gradient">
      <div className="absolute right-5 top-5">
        <AppearanceToggle />
      </div>

      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight text-gradient">
            FUTURE FLOW
          </span>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
