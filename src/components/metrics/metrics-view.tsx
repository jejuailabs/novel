"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart3, Coins, Zap, FileText, Loader2, Users, GitBranch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Project {
  id: string;
  title: string;
}

interface Metric {
  id: string;
  event_type: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cost_krw: number;
  duration_ms: number;
  created_at: string;
}

interface TrackerState {
  characters?: Record<
    string,
    { name?: string; last_appearance_episode?: number; [k: string]: unknown }
  >;
  plots?: Record<
    string,
    { title?: string; planted_episode?: number; resolved?: boolean; [k: string]: unknown }
  >;
  [k: string]: unknown;
}

interface TrackerData {
  state: TrackerState;
}

export function MetricsView({ projects }: { projects: Project[] }) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(
    projects[0] ?? null
  );
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(false);
  const [tracker, setTracker] = useState<TrackerData | null>(null);

  const fetchMetrics = useCallback(async (projectId: string) => {
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/metrics`);
    if (res.ok) {
      const data = await res.json();
      setMetrics(data);
    }
    setLoading(false);
  }, []);

  const fetchTracker = useCallback(async (projectId: string) => {
    const res = await fetch(`/api/projects/${projectId}/tracker`);
    if (res.ok) {
      const data = await res.json();
      setTracker(data);
    }
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchMetrics(selectedProject.id);
      fetchTracker(selectedProject.id);
    }
  }, [selectedProject, fetchMetrics, fetchTracker]);

  const totalTokens = metrics.reduce(
    (s, m) => s + m.input_tokens + m.output_tokens,
    0
  );
  const totalCost = metrics.reduce((s, m) => s + Number(m.cost_krw), 0);
  const totalCacheRead = metrics.reduce(
    (s, m) => s + (m.cache_read_tokens ?? 0),
    0
  );
  const episodeGens = metrics.filter(
    (m) => m.event_type === "episode_gen"
  ).length;

  const byType = metrics.reduce(
    (acc, m) => {
      acc[m.event_type] = (acc[m.event_type] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const eventTypeLabel: Record<string, string> = {
    session_message: "브레인스토밍",
    episode_gen: "원고 생성",
    episode_revision: "원고 수정",
    consistency_check: "일관성 검증",
    tracker_update: "트래커 갱신",
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <select
        className="w-64 rounded-md border border-border bg-card px-3 py-2 text-sm"
        value={selectedProject?.id ?? ""}
        onChange={(e) => {
          const p = projects.find((p) => p.id === e.target.value);
          if (p) setSelectedProject(p);
        }}
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="border-border/50">
              <CardContent className="flex items-center gap-3 py-4">
                <Zap className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">
                    {(totalTokens / 1000).toFixed(1)}K
                  </p>
                  <p className="text-xs text-muted-foreground">총 토큰</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="flex items-center gap-3 py-4">
                <Coins className="h-8 w-8 text-amber-400" />
                <div>
                  <p className="text-2xl font-bold">
                    {totalCost.toLocaleString()}원
                  </p>
                  <p className="text-xs text-muted-foreground">총 비용</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="flex items-center gap-3 py-4">
                <FileText className="h-8 w-8 text-emerald-400" />
                <div>
                  <p className="text-2xl font-bold">{episodeGens}</p>
                  <p className="text-xs text-muted-foreground">원고 생성</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="flex items-center gap-3 py-4">
                <BarChart3 className="h-8 w-8 text-teal-400" />
                <div>
                  <p className="text-2xl font-bold">
                    {totalCacheRead > 0
                      ? `${((totalCacheRead / Math.max(totalTokens, 1)) * 100).toFixed(0)}%`
                      : "0%"}
                  </p>
                  <p className="text-xs text-muted-foreground">캐시 적중률</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Event breakdown */}
          <Card className="border-border/50">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">이벤트 유형별 호출 수</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(byType).map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{eventTypeLabel[type] ?? type}</span>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${(count / Math.max(metrics.length, 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-8 text-right text-muted-foreground">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent metrics table */}
          <Card className="flex-1 border-border/50">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">최근 호출 내역</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="scrollbar-thin max-h-[40vh] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2">유형</th>
                      <th className="pb-2">모델</th>
                      <th className="pb-2 text-right">입력</th>
                      <th className="pb-2 text-right">출력</th>
                      <th className="pb-2 text-right">비용</th>
                      <th className="pb-2 text-right">시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics
                      .slice()
                      .reverse()
                      .slice(0, 50)
                      .map((m) => (
                        <tr key={m.id} className="border-b border-border/30">
                          <td className="py-1.5">
                            {eventTypeLabel[m.event_type] ?? m.event_type}
                          </td>
                          <td className="py-1.5 text-muted-foreground">
                            {m.model?.split("-").slice(-2).join("-") ?? "-"}
                          </td>
                          <td className="py-1.5 text-right">
                            {m.input_tokens.toLocaleString()}
                          </td>
                          <td className="py-1.5 text-right">
                            {m.output_tokens.toLocaleString()}
                          </td>
                          <td className="py-1.5 text-right">
                            {Number(m.cost_krw).toLocaleString()}원
                          </td>
                          <td className="py-1.5 text-right text-muted-foreground">
                            {new Date(m.created_at).toLocaleTimeString("ko-KR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Character Last Appearance */}
          {tracker?.state?.characters && (
            <Card className="border-border/50">
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  인물 마지막 등장
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="scrollbar-thin max-h-[30vh] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-2">인물</th>
                        <th className="pb-2 text-right">마지막 등장</th>
                        <th className="pb-2 text-right">경과 화수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(tracker.state.characters).map(
                        ([key, char]) => {
                          const lastEp = char.last_appearance_episode ?? 0;
                          const latestEp = Math.max(
                            ...Object.values(tracker.state.characters!).map(
                              (c) => c.last_appearance_episode ?? 0
                            ),
                            0
                          );
                          const elapsed = lastEp > 0 ? latestEp - lastEp : "-";
                          return (
                            <tr
                              key={key}
                              className="border-b border-border/30"
                            >
                              <td className="py-1.5">
                                {char.name ?? key}
                              </td>
                              <td className="py-1.5 text-right">
                                {lastEp > 0 ? `${lastEp}화` : "-"}
                              </td>
                              <td className="py-1.5 text-right text-muted-foreground">
                                {typeof elapsed === "number"
                                  ? elapsed === 0
                                    ? "최신"
                                    : `${elapsed}화`
                                  : elapsed}
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Foreshadowing Graph */}
          {tracker?.state?.plots && (
            <Card className="border-border/50">
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <GitBranch className="h-4 w-4" />
                  복선 현황
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const plots = Object.values(tracker.state.plots!);
                  const total = plots.length;
                  const resolved = plots.filter((p) => p.resolved).length;
                  const pct = total > 0 ? (resolved / total) * 100 : 0;
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>
                          심은 복선: <strong>{total}</strong>
                        </span>
                        <span>
                          회수 완료: <strong>{resolved}</strong>
                        </span>
                      </div>
                      <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        회수율: {pct.toFixed(0)}% ({resolved}/{total})
                      </p>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
