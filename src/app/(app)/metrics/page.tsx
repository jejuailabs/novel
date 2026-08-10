import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { MetricsView } from "@/components/metrics/metrics-view";

export default async function MetricsPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("nv_projects")
    .select("id, title")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return <MetricsView projects={projects ?? []} />;
}
