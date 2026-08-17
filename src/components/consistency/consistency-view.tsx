"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Check,
  XCircle,
  AlertTriangle,
  Shield,
  Loader2,
  RefreshCw,
  PenLine,
  BookMarked,
  Radar,
  Users,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSelectedProject } from "@/lib/selected-project";

interface Project {
  id: string;
  title: string;
}

interface Episode {
  id: string;
  bu: number;
  hwa: number;
  status: string;
}

interface Issue {
  type: string;
  severity: string;
  expected: string;
  actual: string;
  source_ref?: string;
  suggested_fix?: string;
}

interface CheckResult {
  id: string;
  episode_id: string;
  passed: boolean;
  issues: Issue[];
  check_run_at: string;
}

type ResolutionOption = "edit_episode" | "edit_bible" | "edit_tracker";

export function ConsistencyView({ projects }: { projects: Project[] }) {
  const { selectedProject } = useSelectedProject(projects);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [checks, setChecks] = useState<Record<string, CheckResult>>({});
  const [loading, setLoading] = useState(false);
  const [rerunning, setRerunning] = useState<string | null>(null);
  const [selectedEpId, setSelectedEpId] = useState<string | null>(null);

  const fetchData = useCallback(async (projectId: string) => {
    setLoading(true);
    const epRes = await fetch(`/api/projects/${projectId}/episodes`);
    if (epRes.ok) {
      const eps: Episode[] = await epRes.json();
      setEpisodes(eps);

      const checkMap: Record<string, CheckResult> = {};
      for (const ep of eps) {
        const epDetail = await fetch(`/api/episodes/${ep.id}`);
        if (epDetail.ok) {
          const data = await epDetail.json();
          if (data.nv_consistency_checks?.length) {
            checkMap[ep.id] =
              data.nv_consistency_checks[data.nv_consistency_checks.length - 1];
          }
        }
      }
      setChecks(checkMap);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedProject) fetchData(selectedProject.id);
  }, [selectedProject, fetchData]);

  async function rerunCheck(episodeId: string) {
    setRerunning(episodeId);
    const res = await fetch("/api/ai/verify-consistency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episodeId }),
    });
    if (res.ok) {
      const result = await res.json();
      setChecks((prev) => ({
        ...prev,
        [episodeId]: { ...result, episode_id: episodeId },
      }));
    }
    setRerunning(null);
  }

  function handleResolve(_episodeId: string, _issueIdx: number, option: ResolutionOption) {
    const routes: Record<ResolutionOption, string> = {
      edit_episode: "/phase2",
      edit_bible: "/bible",
      edit_tracker: "/tracker",
    };
    window.location.href = routes[option];
  }

  const totalChecked = Object.keys(checks).length;
  const totalPassed = Object.values(checks).filter((c) => c.passed).length;
  const allIssues = Object.values(checks).flatMap((c) => c.issues);
  const totalIssues = allIssues.length;

  const severityCounts = allIssues.reduce(
    (acc, i) => {
      acc[i.severity] = (acc[i.severity] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const typeCounts = allIssues.reduce(
    (acc, i) => {
      acc[i.type] = (acc[i.type] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const selectedCheck = selectedEpId ? checks[selectedEpId] : null;
  const selectedEp = episodes.find((e) => e.id === selectedEpId);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 py-4">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalChecked}</p>
              <p className="text-xs text-muted-foreground">검증 완료</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 py-4">
            <Check className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold">{totalPassed}</p>
              <p className="text-xs text-muted-foreground">통과</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-2xl font-bold">{totalIssues}</p>
              <p className="text-xs text-muted-foreground">이슈</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 py-4">
            <XCircle className="h-8 w-8 text-red-400" />
            <div>
              <p className="text-2xl font-bold">{severityCounts["high"] ?? 0}</p>
              <p className="text-xs text-muted-foreground">심각</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="episodes" className="flex-1">
        <TabsList>
          <TabsTrigger value="episodes">회차별 검증</TabsTrigger>
          <TabsTrigger value="analysis">분석 차트</TabsTrigger>
        </TabsList>

        {/* Episodes tab */}
        <TabsContent value="episodes" className="flex flex-1 gap-4 mt-0">
          {/* Left: episode list */}
          <Card className="w-72 shrink-0 border-border/50">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">회차 목록</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : episodes.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">에피소드가 없습니다.</p>
              ) : (
                <div className="space-y-0.5 p-2">
                  {episodes.map((ep) => {
                    const check = checks[ep.id];
                    return (
                      <button
                        key={ep.id}
                        onClick={() => setSelectedEpId(ep.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 ${
                          selectedEpId === ep.id ? "bg-muted" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {check ? (
                            check.passed ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-red-400" />
                            )
                          ) : (
                            <div className="h-3.5 w-3.5 rounded-full border border-border" />
                          )}
                          <span>
                            {ep.bu}부 {ep.hwa}화
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {check && !check.passed && (
                            <span className="text-[10px] text-red-400">
                              {check.issues.length}건
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              rerunCheck(ep.id);
                            }}
                            disabled={rerunning === ep.id}
                          >
                            {rerunning === ep.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: detail with resolution options */}
          <Card className="flex-1 border-border/50">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">
                {selectedEp
                  ? `${selectedEp.bu}부 ${selectedEp.hwa}화 검증 결과`
                  : "회차를 선택하세요"}
              </CardTitle>
            </CardHeader>
            <CardContent className="scrollbar-thin max-h-[60vh] overflow-y-auto">
              {selectedCheck ? (
                <div className="space-y-3">
                  <div
                    className={`flex items-center gap-2 rounded-lg p-3 text-sm font-medium ${
                      selectedCheck.passed
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {selectedCheck.passed ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <XCircle className="h-5 w-5" />
                    )}
                    {selectedCheck.passed
                      ? "모든 검증 통과"
                      : `${selectedCheck.issues.length}건의 불일치 발견`}
                  </div>

                  {selectedCheck.issues.map((issue, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border p-4 ${
                        issue.severity === "high"
                          ? "border-red-500/30 bg-red-500/5"
                          : issue.severity === "medium"
                          ? "border-amber-500/30 bg-amber-500/5"
                          : "border-blue-500/30 bg-blue-500/5"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle
                          className={`h-4 w-4 ${
                            issue.severity === "high"
                              ? "text-red-400"
                              : issue.severity === "medium"
                              ? "text-amber-400"
                              : "text-blue-400"
                          }`}
                        />
                        <span className="font-medium text-sm">{issue.type}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            issue.severity === "high"
                              ? "border-red-500/50 text-red-400"
                              : issue.severity === "medium"
                              ? "border-amber-500/50 text-amber-400"
                              : "border-blue-500/50 text-blue-400"
                          }`}
                        >
                          {issue.severity}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs mb-3">
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">예상:</span>{" "}
                          {issue.expected}
                        </p>
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">실제:</span>{" "}
                          {issue.actual}
                        </p>
                        {issue.suggested_fix && (
                          <p className="text-primary mt-1">
                            제안: {issue.suggested_fix}
                          </p>
                        )}
                      </div>

                      {/* 3-option resolution */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleResolve(selectedEpId!, i, "edit_episode")}
                        >
                          <PenLine className="mr-1 h-3 w-3" />
                          원고 수정
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleResolve(selectedEpId!, i, "edit_bible")}
                        >
                          <BookMarked className="mr-1 h-3 w-3" />
                          성경 개정
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleResolve(selectedEpId!, i, "edit_tracker")}
                        >
                          <Radar className="mr-1 h-3 w-3" />
                          트래커 수정
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  좌측에서 회차를 선택하면 상세 검증 결과를 볼 수 있습니다.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis tab */}
        <TabsContent value="analysis" className="mt-0">
          <div className="grid grid-cols-2 gap-4">
            {/* Issue type distribution */}
            <Card className="border-border/50">
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <GitBranch className="h-4 w-4" />
                  이슈 유형 분포
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(typeCounts).length === 0 ? (
                  <p className="text-xs text-muted-foreground">데이터 없음</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(typeCounts)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between text-sm">
                          <span className="truncate">{type}</span>
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{
                                  width: `${(count / Math.max(totalIssues, 1)) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="w-6 text-right text-xs text-muted-foreground">
                              {count}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Severity breakdown */}
            <Card className="border-border/50">
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  심각도 분포
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(["high", "medium", "low"] as const).map((sev) => {
                    const count = severityCounts[sev] ?? 0;
                    const colors = {
                      high: "bg-red-500",
                      medium: "bg-amber-500",
                      low: "bg-blue-500",
                    };
                    const labels = { high: "심각", medium: "중간", low: "낮음" };
                    return (
                      <div key={sev} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${colors[sev]}`} />
                          <span>{labels[sev]}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${colors[sev]}`}
                              style={{
                                width: `${(count / Math.max(totalIssues, 1)) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="w-6 text-right text-xs text-muted-foreground">
                            {count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Episode-by-episode issue count */}
            <Card className="col-span-2 border-border/50">
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  회차별 이슈 현황
                </CardTitle>
              </CardHeader>
              <CardContent>
                {episodes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">데이터 없음</p>
                ) : (
                  <div className="flex items-end gap-1" style={{ height: 120 }}>
                    {episodes.map((ep) => {
                      const check = checks[ep.id];
                      const count = check?.issues.length ?? 0;
                      const maxCount = Math.max(
                        ...Object.values(checks).map((c) => c.issues.length),
                        1
                      );
                      const height = (count / maxCount) * 100;
                      return (
                        <div
                          key={ep.id}
                          className="flex flex-1 flex-col items-center gap-1"
                        >
                          <span className="text-[9px] text-muted-foreground">
                            {count > 0 ? count : ""}
                          </span>
                          <div
                            className={`w-full rounded-t ${
                              count === 0
                                ? "bg-emerald-500/40"
                                : count <= 2
                                ? "bg-amber-500/60"
                                : "bg-red-500/60"
                            }`}
                            style={{
                              height: `${Math.max(height, 4)}%`,
                              minHeight: 4,
                            }}
                          />
                          <span className="text-[9px] text-muted-foreground">
                            {ep.hwa}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
