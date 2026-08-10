import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface NvProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  locale: "ko" | "en";
  created_at: string;
}

/** Current auth user + nv_profiles row (or nulls when signed out). */
export async function getSessionProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null as NvProfile | null };

  const { data: profile } = await supabase
    .from("nv_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: (profile as NvProfile) ?? null };
}

export async function requireUser() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  return { user, profile };
}

export async function requireAdmin() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (!profile || profile.role !== "admin") redirect("/dashboard?denied=admin");
  return { user, profile };
}
