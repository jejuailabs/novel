import { requireUser } from "@/lib/auth";
import { SettingsView } from "@/components/settings/settings-view";

export default async function SettingsPage() {
  const { user, profile } = await requireUser();

  return (
    <SettingsView
      email={user.email ?? ""}
      displayName={profile?.display_name ?? ""}
      avatarUrl={profile?.avatar_url ?? ""}
    />
  );
}
