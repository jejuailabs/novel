import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { ConsistencyView } from "@/components/consistency/consistency-view";

export default async function ConsistencyPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("nv_projects")
    .select("id, title")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return <ConsistencyView projects={projects ?? []} />;
}
