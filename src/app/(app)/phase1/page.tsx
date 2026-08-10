import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { Phase1View } from "@/components/phase1/phase1-view";

export default async function Phase1Page() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("nv_projects")
    .select("id, title, genre, phase, target_length")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return <Phase1View projects={projects ?? []} />;
}
