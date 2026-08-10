import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { BibleView } from "@/components/bible/bible-view";

export default async function BiblePage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("nv_projects")
    .select("id, title")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return <BibleView projects={projects ?? []} />;
}
