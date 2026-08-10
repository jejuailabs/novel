"use client";

import * as React from "react";
import {
  Paperclip,
  Link2,
  Image as ImageIcon,
  SendHorizonal,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProgressRing } from "./progress-ring";
import {
  DEMO_NODES,
  DEMO_MESSAGES,
  DEMO_SUGGESTIONS,
  DEMO_CHARACTER,
  DEMO_PRINCIPLES,
  DEMO_PROGRESS,
  type NodeStatus,
} from "./demo-data";

const STATUS_STYLE: Record<NodeStatus, string> = {
  확정: "bg-teal/15 text-teal",
  진화중: "bg-violet/15 text-violet",
  보류: "bg-muted text-muted-foreground",
  폐기: "bg-destructive/15 text-destructive",
};

export function DashboardView() {
  const { t } = useT();
  const [filter, setFilter] = React.useState<"all" | "확정">("all");

  const nodes = DEMO_NODES.filter((n) =>
    filter === "all" ? true : n.status === "확정"
  );

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
            {nodes.map((n) => (
              <button
                key={n.number}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-secondary/50"
              >
                <span className="font-mono text-[10px] text-muted-foreground">
                  {n.number}
                </span>
                <span className="flex-1 truncate text-sm">{n.title}</span>
                <span className="text-[10px] text-muted-foreground">
                  {n.tags}
                </span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium",
                    STATUS_STYLE[n.status]
                  )}
                >
                  {n.status}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* Phase 2 progress */}
        <Card className="flex items-center gap-4 p-4">
          <ProgressRing value={DEMO_PROGRESS.value} />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {t("dashboard.phase2progress")}
            </p>
            <p className="mt-1 text-sm font-medium">
              {t("dashboard.nodes")} {DEMO_PROGRESS.done} / {DEMO_PROGRESS.total}
            </p>
          </div>
        </Card>
      </div>

      {/* ── Center: Brainstorm ──────────────────────── */}
      <Card className="flex min-h-0 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{t("dashboard.brainstorm")}</h2>
          <Badge variant="violet" className="ml-auto">
            Phase 1
          </Badge>
        </div>

        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {DEMO_MESSAGES.map((m) => (
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
                {m.time}
              </span>
            </div>
          ))}

          <div className="flex flex-wrap gap-2 pt-2">
            {DEMO_SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background/50 px-3 py-2">
            <button className="text-muted-foreground hover:text-foreground">
              <Paperclip className="h-4 w-4" />
            </button>
            <button className="text-muted-foreground hover:text-foreground">
              <ImageIcon className="h-4 w-4" />
            </button>
            <button className="text-muted-foreground hover:text-foreground">
              <Link2 className="h-4 w-4" />
            </button>
            <input
              placeholder={t("dashboard.inputPlaceholder")}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button size="icon" className="h-8 w-8">
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </div>
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
              <BibleBody />
            </TabsContent>
            <TabsContent value="production">
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("common.empty")}
              </p>
            </TabsContent>
            <TabsContent value="log">
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("common.empty")}
              </p>
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-auto border-t border-border p-3">
          <Button variant="outline" className="w-full justify-between">
            {t("dashboard.viewFullBible")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

function BibleBody() {
  const { t } = useT();
  return (
    <div className="scrollbar-thin max-h-[calc(100dvh-360px)] space-y-5 overflow-y-auto pr-1">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground">
            {t("dashboard.bible.mainCharacter")}
          </h3>
          <Badge variant="outline">v1.2</Badge>
        </div>
        <p className="rounded-lg bg-secondary/40 p-3 text-sm leading-relaxed">
          {DEMO_CHARACTER}
        </p>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground">
            {t("dashboard.bible.worldview")}
          </h3>
          <Badge variant="outline">v1.1</Badge>
        </div>
        <ul className="space-y-1.5">
          {DEMO_PRINCIPLES.map((p) => (
            <li
              key={p}
              className="rounded-lg bg-secondary/40 px-3 py-2 text-sm"
            >
              {p}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
