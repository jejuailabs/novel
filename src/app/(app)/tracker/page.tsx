import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { TrackerView } from "@/components/tracker/tracker-view";

export default async function TrackerPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("nv_projects")
    .select("id, title")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return <TrackerView projects={projects ?? []} />;
}
