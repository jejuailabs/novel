"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ChevronRight,
  FolderOpen,
  BookMarked,
  PenLine,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProgressRing } from "./progress-ring";

type NodeStatus = "확정" | "진화중" | "보류" | "폐기";

const STATUS_STYLE: Record<string, string> = {
  확정: "bg-teal/15 text-teal",
  진화중: "bg-violet/15 text-violet",
  보류: "bg-muted text-muted-foreground",
  폐기: "bg-destructive/15 text-destructive",
};

interface DashboardProps {
  project: { id: string; title: string; genre: string; phase: number; target_length: number | null } | null;
  projects: { id: string; title: string }[];
  nodes: { id: string; node_number: string; title: string; status: string; tags: string[] }[];
  bible: {
    concept_bible: Record<string, unknown>;
    production_bible: Record<string, unknown>;
    creation_log: Record<string, unknown>;
  } | null;
  messages: { id: string; role: string; content: string; created_at: string }[];
  progress: { value: number; done: number; total: number };
  episodeProgress: { done: number; total: number };
}

export function DashboardView({
  project,
  nodes,
  bible,
  messages,
  progress,
  episodeProgress,
}: DashboardProps) {
  const { t } = useT();
  const router = useRouter();
  const [filter, setFilter] = React.useState<"all" | "확정">("all");

  const filteredNodes = nodes.filter((n) =>
    filter === "all" ? true : n.status === "확정"
  );

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
        <FolderOpen className="h-12 w-12 opacity-30" />
        <p className="text-sm">프로젝트가 없습니다. 먼저 프로젝트를 생성하세요.</p>
        <Button onClick={() => router.push("/projects")}>
          프로젝트 만들기
        </Button>
      </div>
    );
  }

  const conceptBible = bible?.concept_bible ?? {};
  const productionBible = bible?.production_bible ?? {};
  const creationLog = bible?.creation_log ?? {};

  return (
    <div className="grid h-full grid-cols-1 gap-5 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
      {/* ── Left: Nodes ─────────────────────────────── */}
      <div className="flex min-h-0 flex-col gap-5">
        <Card className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between px-4 pt-4">
            <h2 className="text-sm font-semibold">{t("dashboard.nodes")}</h2>
            <div className="flex rounded-lg bg-secondary/60 p-0.5 text-xs">
              <button
                onClick={() => setFilter("all")}
                className={cn(
                  "rounded-md px-2 py-1",
                  filter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                )}
              >
                {t("dashboard.nodes.all")}
              </button>
              <button
                onClick={() => setFilter("확정")}
                className={cn(
                  "rounded-md px-2 py-1",
                  filter === "확정"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                )}
              >
                {t("dashboard.nodes.confirmed")}
              </button>
            </div>
          </div>
          <div className="scrollbar-thin mt-3 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
            {filteredNodes.length === 0 ? (
              <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                {nodes.length === 0
                  ? "노드가 없습니다. Phase 1에서 브레인스토밍을 시작하세요."
                  : "확정된 노드가 없습니다."}
              </p>
            ) : (
              filteredNodes.map((n) => (
                <button
                  key={n.id}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-secondary/50 active:scale-[0.98]"
                  onClick={() => router.push("/phase1")}
                >
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {n.node_number}
                  </span>
                  <span className="flex-1 truncate text-sm">{n.title}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {n.tags?.length ?? 0}
                  </span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium",
                      STATUS_STYLE[n.status] ?? "bg-muted text-muted-foreground"
                    )}
                  >
                    {n.status}
                  </span>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Phase 2 progress */}
        <Card className="flex items-center gap-4 p-4">
          <ProgressRing value={progress.value} />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {t("dashboard.phase2progress")}
            </p>
            <p className="mt-1 text-sm font-medium">
              {t("dashboard.nodes")} {progress.done} / {progress.total}
            </p>
          </div>
        </Card>
      </div>

      {/* ── Center: Recent messages ──────────────────────── */}
      <Card className="flex min-h-0 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{t("dashboard.brainstorm")}</h2>
          <Badge variant="violet" className="ml-auto">
            Phase {project.phase}
          </Badge>
        </div>

        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <Sparkles className="h-8 w-8 opacity-30" />
              <p className="text-sm">
                아직 대화가 없습니다.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(project.phase === 1 ? "/phase1" : "/phase2")
                }
              >
                {project.phase === 1 ? "브레인스토밍 시작" : "원고 생산 시작"}
                <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col gap-1",
                  m.role === "user" ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-pink/15 text-foreground rounded-br-sm"
                      : "bg-secondary/70 rounded-bl-sm"
                  )}
                >
                  {m.content}
                </div>
                <span className="px-1 text-[10px] text-muted-foreground">
                  {m.role === "user" ? t("common.you") : t("common.assistant")} ·{" "}
                  {new Date(m.created_at).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Go to phase button */}
        <div className="border-t border-border p-3">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() =>
              router.push(project.phase === 1 ? "/phase1" : "/phase2")
            }
          >
            {project.phase === 1 ? (
              <>
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Phase 1 계속하기
                </span>
                <ChevronRight className="h-4 w-4" />
              </>
            ) : (
              <>
                <span className="flex items-center gap-2">
                  <PenLine className="h-4 w-4" />
                  Phase 2 원고 생산
                </span>
                <span className="text-xs text-muted-foreground">
                  {episodeProgress.done}/{episodeProgress.total}화
                </span>
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* ── Right: Bible preview ────────────────────── */}
      <Card className="flex min-h-0 flex-col">
        <div className="px-4 pt-4">
          <h2 className="text-sm font-semibold">
            {t("dashboard.biblePreview")}
          </h2>
          <Tabs defaultValue="concept" className="mt-3">
            <TabsList className="w-full">
              <TabsTrigger value="concept" className="flex-1">
                {t("dashboard.bible.concept")}
              </TabsTrigger>
              <TabsTrigger value="production" className="flex-1">
                {t("dashboard.bible.production")}
              </TabsTrigger>
              <TabsTrigger value="log" className="flex-1">
                {t("dashboard.bible.log")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="concept">
              <BibleSection data={conceptBible} />
            </TabsContent>
            <TabsContent value="production">
              <BibleSection data={productionBible} />
            </TabsContent>
            <TabsContent value="log">
              <BibleSection data={creationLog} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-auto border-t border-border p-3">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => router.push("/bible")}
          >
            <span className="flex items-center gap-2">
              <BookMarked className="h-4 w-4" />
              {t("dashboard.viewFullBible")}
            </span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

function BibleSection({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        아직 내용이 없습니다.
      </p>
    );
  }

  return (
    <div className="scrollbar-thin max-h-[calc(100dvh-360px)] space-y-3 overflow-y-auto pr-1">
      {entries.map(([key, value]) => (
        <section key={key}>
          <h3 className="mb-1 text-xs font-semibold text-muted-foreground">
            {key}
          </h3>
          <div className="rounded-lg bg-secondary/40 p-3 text-sm leading-relaxed">
            {typeof value === "string"
              ? value
              : Array.isArray(value)
              ? (value as string[]).map((item, i) => (
                  <p key={i} className="mb-1 last:mb-0">
                    {typeof item === "string" ? item : JSON.stringify(item)}
                  </p>
                ))
              : typeof value === "object" && value !== null
              ? Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                  <p key={k} className="mb-1 last:mb-0">
                    <span className="font-medium">{k}:</span>{" "}
                    {typeof v === "string" ? v : JSON.stringify(v)}
                  </p>
                ))
              : String(value)}
          </div>
        </section>
      ))}
    </div>
  );
}
