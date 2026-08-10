import { createClient } from "@/lib/supabase/server";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [projectsRes, metricsRes] = await Promise.all([
    supabase
      .from("nv_projects")
      .select("id, title, genre, phase, target_length, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("nv_metrics")
      .select("input_tokens, output_tokens, cost_krw")
      .eq("project_id", ""),
  ]);

  const projects = projectsRes.data ?? [];
  const activeProject = projects[0] ?? null;

  let nodes: {
    id: string;
    node_number: string;
    title: string;
    status: string;
    tags: string[];
  }[] = [];
  let bible: {
    concept_bible: Record<string, unknown>;
    production_bible: Record<string, unknown>;
    creation_log: Record<string, unknown>;
  } | null = null;
  let messages: { id: string; role: string; content: string; created_at: string }[] = [];
  let episodes: { id: string; status: string }[] = [];

  if (activeProject) {
    const [nodesRes, bibleRes, sessionsRes, episodesRes] = await Promise.all([
      supabase
        .from("nv_nodes")
        .select("id, node_number, title, status, tags")
        .eq("project_id", activeProject.id)
        .order("node_number"),
      supabase
        .from("nv_bibles")
        .select("concept_bible, production_bible, creation_log")
        .eq("project_id", activeProject.id)
        .single(),
      supabase
        .from("nv_sessions")
        .select("id")
        .eq("project_id", activeProject.id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("nv_episodes")
        .select("id, status")
        .eq("project_id", activeProject.id),
    ]);

    nodes = nodesRes.data ?? [];
    bible = bibleRes.data ?? null;
    episodes = episodesRes.data ?? [];

    const latestSession = sessionsRes.data?.[0];
    if (latestSession) {
      const { data: msgs } = await supabase
        .from("nv_messages")
        .select("id, role, content, created_at")
        .eq("session_id", latestSession.id)
        .order("created_at", { ascending: true })
        .limit(20);
      messages = msgs ?? [];
    }
  }

  const confirmedNodes = nodes.filter((n) => n.status === "확정").length;
  const targetNodes = activeProject?.target_length
    ? Math.ceil(activeProject.target_length * 0.625)
    : 90;
  const progressValue = targetNodes > 0 ? Math.round((confirmedNodes / targetNodes) * 100) : 0;

  const approvedEpisodes = episodes.filter(
    (e) => e.status === "approved" || e.status === "locked"
  ).length;
  const totalEpisodes = activeProject?.target_length ?? 144;

  return (
    <DashboardView
      project={activeProject}
      projects={projects}
      nodes={nodes}
      bible={bible}
      messages={messages}
      progress={{ value: Math.min(progressValue, 100), done: confirmedNodes, total: targetNodes }}
      episodeProgress={{ done: approvedEpisodes, total: totalEpisodes }}
    />
  );
}
