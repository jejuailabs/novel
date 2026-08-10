import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { ProjectsView } from "@/components/projects/projects-view";

export default async function ProjectsPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("nv_projects")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return <ProjectsView projects={projects ?? []} />;
}
