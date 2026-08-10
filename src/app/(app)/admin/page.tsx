import { createClient } from "@/lib/supabase/server";
import { AdminConsole, type AdminMember, type AdminStats } from "./admin-console";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();

  const [{ data: members }, { count: projectCount }, { count: episodeCount }, { data: metrics }] =
    await Promise.all([
      supabase
        .from("nv_profiles")
        .select("id, email, display_name, avatar_url, role, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("nv_projects").select("id", { count: "exact", head: true }),
      supabase.from("nv_episodes").select("id", { count: "exact", head: true }),
      supabase.from("nv_metrics").select("input_tokens, output_tokens, cost_krw"),
    ]);

  const tokens =
    metrics?.reduce(
      (s, m) => s + (m.input_tokens ?? 0) + (m.output_tokens ?? 0),
      0
    ) ?? 0;
  const costKrw =
    metrics?.reduce((s, m) => s + Number(m.cost_krw ?? 0), 0) ?? 0;

  const list = (members ?? []) as AdminMember[];
  const stats: AdminStats = {
    totalMembers: list.length,
    adminCount: list.filter((m) => m.role === "admin").length,
    projects: projectCount ?? 0,
    episodes: episodeCount ?? 0,
    tokens,
    costKrw,
  };

  return <AdminConsole members={list} stats={stats} />;
}
