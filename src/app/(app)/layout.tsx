import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/app/sidebar";
import { ShellHeader } from "@/components/app/shell-header";
import type { TopbarStats } from "@/components/app/topbar";

async function getStats(): Promise<TopbarStats> {
  const supabase = await createClient();

  const [{ data: metrics }, { count: episodesDone }] = await Promise.all([
    supabase.from("nv_metrics").select("input_tokens, output_tokens, cost_krw"),
    supabase
      .from("nv_episodes")
      .select("id", { count: "exact", head: true })
      .in("status", ["approved", "locked"]),
  ]);

  const tokens =
    metrics?.reduce(
      (s, m) => s + (m.input_tokens ?? 0) + (m.output_tokens ?? 0),
      0
    ) ?? 0;
  const costKrw = metrics?.reduce((s, m) => s + Number(m.cost_krw ?? 0), 0) ?? 0;

  return {
    tokens,
    costKrw,
    episodesDone: episodesDone ?? 0,
    episodesTotal: 144,
  };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireUser();
  const stats = await getStats();

  const displayUser = {
    name:
      profile?.display_name ||
      (user.email ? user.email.split("@")[0] : "User"),
    email: user.email ?? "",
    avatar: profile?.avatar_url ?? null,
  };
  const isAdmin = profile?.role === "admin";
  const plan = "free";

  return (
    <div className="flex h-dvh overflow-hidden bg-app-gradient">
      <Sidebar isAdmin={isAdmin} user={displayUser} plan={plan} />
      <div className="flex min-w-0 flex-1 flex-col">
        <ShellHeader stats={stats} user={displayUser} isAdmin={isAdmin} />
        <main className="scrollbar-thin flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
