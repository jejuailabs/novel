"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  ShieldCheck,
  FolderKanban,
  PenLine,
  Coins,
  Wallet,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n";
import { cn, formatKRW, formatTokens } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

export interface AdminMember {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  created_at: string;
}

export interface AdminStats {
  totalMembers: number;
  adminCount: number;
  projects: number;
  episodes: number;
  tokens: number;
  costKrw: number;
}

export function AdminConsole({
  members,
  stats,
}: {
  members: AdminMember[];
  stats: AdminStats;
}) {
  const { t } = useT();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">{t("admin.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.subtitle")}</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("admin.overview")}</TabsTrigger>
          <TabsTrigger value="members">{t("admin.members")}</TabsTrigger>
          <TabsTrigger value="data">{t("admin.data")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard
              icon={<Users className="h-4 w-4 text-violet" />}
              label={t("admin.members.total")}
              value={String(stats.totalMembers)}
            />
            <StatCard
              icon={<ShieldCheck className="h-4 w-4 text-pink" />}
              label={t("admin.members.admins")}
              value={String(stats.adminCount)}
            />
            <StatCard
              icon={<FolderKanban className="h-4 w-4 text-cyan" />}
              label={t("admin.data.projects")}
              value={String(stats.projects)}
            />
            <StatCard
              icon={<PenLine className="h-4 w-4 text-primary" />}
              label={t("admin.data.episodes")}
              value={String(stats.episodes)}
            />
            <StatCard
              icon={<Coins className="h-4 w-4 text-cyan" />}
              label={t("admin.data.tokens")}
              value={formatTokens(stats.tokens)}
            />
            <StatCard
              icon={<Wallet className="h-4 w-4 text-teal" />}
              label={t("admin.data.cost")}
              value={formatKRW(stats.costKrw)}
            />
          </div>
        </TabsContent>

        <TabsContent value="members">
          <MembersTable members={members} />
        </TabsContent>

        <TabsContent value="data">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={<FolderKanban className="h-4 w-4 text-cyan" />}
              label={t("admin.data.projects")}
              value={String(stats.projects)}
            />
            <StatCard
              icon={<PenLine className="h-4 w-4 text-primary" />}
              label={t("admin.data.episodes")}
              value={String(stats.episodes)}
            />
            <StatCard
              icon={<Coins className="h-4 w-4 text-cyan" />}
              label={t("admin.data.tokens")}
              value={formatTokens(stats.tokens)}
            />
            <StatCard
              icon={<Wallet className="h-4 w-4 text-teal" />}
              label={t("admin.data.cost")}
              value={formatKRW(stats.costKrw)}
            />
          </div>
          <Card className="mt-4 p-5 text-sm text-muted-foreground">
            데이터 상세 관리(프로젝트별 삭제·내보내기)는 다음 이터레이션에서
            추가됩니다.
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/60">
          {icon}
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}

function MembersTable({ members }: { members: AdminMember[] }) {
  const { t } = useT();
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [busy, setBusy] = React.useState<string | null>(null);

  async function toggleRole(m: AdminMember) {
    setBusy(m.id);
    const next = m.role === "admin" ? "user" : "admin";
    const { error } = await supabase
      .from("nv_profiles")
      .update({ role: next })
      .eq("id", m.id);
    setBusy(null);
    if (!error) router.refresh();
  }

  if (members.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        {t("common.empty")}
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">회원</th>
              <th className="px-4 py-3 font-medium">{t("admin.members.role")}</th>
              <th className="px-4 py-3 font-medium">
                {t("admin.members.joined")}
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const name =
                m.display_name || (m.email ? m.email.split("@")[0] : "User");
              return (
                <tr
                  key={m.id}
                  className="border-b border-border/60 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {m.avatar_url && (
                          <AvatarImage src={m.avatar_url} alt={name} />
                        )}
                        <AvatarFallback>
                          {name.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {m.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={m.role === "admin" ? "pink" : "outline"}>
                      {t(
                        m.role === "admin"
                          ? "common.role.admin"
                          : "common.role.user"
                      )}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant={m.role === "admin" ? "outline" : "secondary"}
                      onClick={() => toggleRole(m)}
                      disabled={busy === m.id}
                      className={cn(busy === m.id && "opacity-70")}
                    >
                      {busy === m.id && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                      {t(
                        m.role === "admin"
                          ? "admin.members.makeUser"
                          : "admin.members.makeAdmin"
                      )}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
