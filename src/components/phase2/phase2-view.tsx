"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Play,
  Check,
  XCircle,
  FileText,
  Loader2,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Download,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Project {
  id: string;
  title: string;
  genre: string;
  phase: number;
  target_length: number | null;
}

interface Episode {
  id: string;
  bu: number;
  hwa: number;
  word_count: number | null;
  status: string;
}

export function Phase2View({ projects }: { projects: Project[] }) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(
    projects[0] ?? null
  );
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEp, setSelectedEp] = useState<string | null>(null);
  const [epContent, setEpContent] = useState("");
  const [epStatus, setEpStatus] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [consistencyResult, setConsistencyResult] = useState<{
    passed: boolean;
    issues: { type: string; severity: string; expected: string; actual: string; suggested_fix?: string }[];
  } | null>(null);
  const [nextBu, setNextBu] = useState(1);
  const [nextHwa, setNextHwa] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [lastSavedContent, setLastSavedContent] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [collapsedBu, setCollapsedBu] = useState<Set<number>>(new Set());

  const fetchEpisodes = useCallback(async (projectId: string) => {
    const res = await fetch(`/api/projects/${projectId}/episodes`);
    if (res.ok) {
      const data = await res.json();
      setEpisodes(data);
      if (data.length > 0) {
        const last = data[data.length - 1];
        setNextBu(last.bu);
        setNextHwa(last.hwa + 1);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchEpisodes(selectedProject.id);
      setSelectedEp(null);
      setEpContent("");
      setConsistencyResult(null);
    }
  }, [selectedProject, fetchEpisodes]);

  const saveContent = useCallback(async (content: string) => {
    if (!selectedEp) return;
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/episodes/${selectedEp}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setLastSavedContent(content);
        setSaveStatus("saved");
      } else {
        setSaveStatus("unsaved");
      }
    } catch {
      setSaveStatus("unsaved");
    }
  }, [selectedEp]);

  const handleContentChange = useCallback((newContent: string) => {
    setEpContent(newContent);
    setSaveStatus("unsaved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveContent(newContent);
    }, 3000);
  }, [saveContent]);

  const handleManualSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveContent(epContent);
  }, [saveContent, epContent]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  async function handleGenerate() {
    if (!selectedProject || streaming) return;
    setStreaming(true);
    setEpContent("");
    setEpStatus("streaming");
    setConsistencyResult(null);

    try {
      const res = await fetch("/api/ai/generate-episode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject.id,
          bu: nextBu,
          hwa: nextHwa,
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");

      let buffer = "";
      let episodeId = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));
          if (data.text) {
            setEpContent((prev) => prev + data.text);
          }
          if (data.done && data.episodeId) {
            episodeId = data.episodeId;
            setSelectedEp(episodeId);
            setEpStatus("draft");
          }
        }
      }

      await fetchEpisodes(selectedProject.id);

      // 자동 일관성 검증
      if (episodeId) {
        setVerifying(true);
        const verifyRes = await fetch("/api/ai/verify-consistency", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ episodeId }),
        });
        if (verifyRes.ok) {
          const result = await verifyRes.json();
          setConsistencyResult(result);
          setEpStatus(result.passed ? "reviewed" : "draft");
        }
        setVerifying(false);
      }
    } catch (err) {
      setEpContent(`오류: ${err}`);
    } finally {
      setStreaming(false);
    }
  }

  async function handleApprove() {
    if (!selectedEp) return;
    const res = await fetch(`/api/episodes/${selectedEp}/approve`, {
      method: "POST",
    });
    if (res.ok) {
      setEpStatus("approved");
      setNextHwa((h) => h + 1);
      if (selectedProject) fetchEpisodes(selectedProject.id);
    }
  }

  async function selectEpisode(ep: Episode) {
    // Save pending changes before switching
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (selectedEp && saveStatus === "unsaved" && epContent !== lastSavedContent) {
      await saveContent(epContent);
    }

    setSelectedEp(ep.id);
    setEpStatus(ep.status);
    setSaveStatus("saved");
    const res = await fetch(`/api/episodes/${ep.id}`);
    if (res.ok) {
      const data = await res.json();
      const content = data.content ?? "";
      setEpContent(content);
      setLastSavedContent(content);
      if (data.nv_consistency_checks?.length) {
        const latest = data.nv_consistency_checks[data.nv_consistency_checks.length - 1];
        setConsistencyResult(latest);
      } else {
        setConsistencyResult(null);
      }
    }
  }

  async function handleExport() {
    if (!selectedProject || exporting) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/export`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedProject.title}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  }

  // Episode tree grouped by bu
  const episodeTree = useMemo(() => {
    const grouped = new Map<number, Episode[]>();
    for (const ep of episodes) {
      if (!grouped.has(ep.bu)) grouped.set(ep.bu, []);
      grouped.get(ep.bu)!.push(ep);
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([bu, eps]) => ({
        bu,
        episodes: eps.sort((a, b) => a.hwa - b.hwa),
        approved: eps.filter((e) => e.status === "approved" || e.status === "locked").length,
        total: eps.length,
      }));
  }, [episodes]);

  const overallApproved = useMemo(
    () => episodes.filter((e) => e.status === "approved" || e.status === "locked").length,
    [episodes]
  );

  const toggleBu = useCallback((bu: number) => {
    setCollapsedBu((prev) => {
      const next = new Set(prev);
      if (next.has(bu)) next.delete(bu);
      else next.add(bu);
      return next;
    });
  }, []);

  const isEditable = epStatus === "draft" || epStatus === "reviewed";

  const statusBadge: Record<string, { label: string; color: string }> = {
    draft: { label: "초안", color: "bg-amber-500/20 text-amber-400" },
    streaming: { label: "생성 중", color: "bg-blue-500/20 text-blue-400" },
    reviewed: { label: "검증 완료", color: "bg-emerald-500/20 text-emerald-400" },
    approved: { label: "승인", color: "bg-primary/20 text-primary" },
    locked: { label: "확정", color: "bg-teal-500/20 text-teal-400" },
  };

  return (
    <div className="flex h-full gap-4">
      {/* Left: Episodes list */}
      <div className="flex w-64 shrink-0 flex-col gap-3">
        <select
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          value={selectedProject?.id ?? ""}
          onChange={(e) => {
            const p = projects.find((p) => p.id === e.target.value);
            if (p) setSelectedProject(p);
          }}
        >
          {projects.length === 0 && <option value="">프로젝트 없음</option>}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>

        <Button onClick={handleGenerate} disabled={streaming || !selectedProject}>
          {streaming ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {nextBu}부 {nextHwa}화 생성
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting || !selectedProject}
        >
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          내보내기
        </Button>

        <div className="scrollbar-thin flex-1 overflow-y-auto">
          {/* Overall progress */}
          {episodes.length > 0 && (
            <div className="mb-2 rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              전체 진행: <span className="font-medium text-foreground">{overallApproved}</span> / {episodes.length} 승인
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${episodes.length ? (overallApproved / episodes.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Tree view grouped by bu */}
          <div className="space-y-1">
            {episodeTree.map(({ bu, episodes: buEps, approved, total }) => (
              <div key={bu}>
                <button
                  onClick={() => toggleBu(bu)}
                  className="flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-muted/50"
                >
                  {collapsedBu.has(bu) ? (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span>{bu}부</span>
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    {approved}/{total} 승인 ({total}화)
                  </span>
                </button>
                {!collapsedBu.has(bu) && (
                  <div className="ml-3 space-y-0.5 border-l border-border/40 pl-2">
                    {buEps.map((ep) => (
                      <button
                        key={ep.id}
                        onClick={() => selectEpisode(ep)}
                        className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/50 ${
                          selectedEp === ep.id ? "bg-muted" : ""
                        }`}
                      >
                        <span>{ep.hwa}화</span>
                        <div className="flex items-center gap-2">
                          {ep.word_count && (
                            <span className="text-xs text-muted-foreground">
                              {ep.word_count.toLocaleString()}자
                            </span>
                          )}
                          <Badge
                            className={`text-[10px] ${statusBadge[ep.status]?.color ?? ""}`}
                            variant="secondary"
                          >
                            {statusBadge[ep.status]?.label ?? ep.status}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Center: Manuscript */}
      <Card className="flex min-w-0 flex-1 flex-col border-border/50">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            원고
            {epStatus && (
              <Badge
                className={`ml-2 text-[10px] ${statusBadge[epStatus]?.color ?? ""}`}
                variant="secondary"
              >
                {statusBadge[epStatus]?.label ?? epStatus}
              </Badge>
            )}
            {selectedEp && isEditable && (
              <span className={`ml-2 text-xs font-normal ${
                saveStatus === "saved" ? "text-muted-foreground" :
                saveStatus === "saving" ? "text-blue-400" :
                "text-amber-400"
              }`}>
                {saveStatus === "saved" ? "저장됨" :
                 saveStatus === "saving" ? "저장 중..." :
                 "수정됨 (미저장)"}
              </span>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {selectedEp && isEditable && saveStatus === "unsaved" && (
              <Button size="sm" variant="ghost" onClick={handleManualSave}>
                <Save className="mr-1 h-3 w-3" />
                저장
              </Button>
            )}
            {selectedEp && epStatus === "draft" && (
              <Button size="sm" variant="outline" onClick={handleApprove}>
                <Check className="mr-1 h-3 w-3" />
                승인
              </Button>
            )}
            {selectedEp && epStatus === "reviewed" && (
              <Button size="sm" onClick={handleApprove}>
                <Check className="mr-1 h-3 w-3" />
                승인
              </Button>
            )}
          </div>
        </CardHeader>
        <div className="scrollbar-thin flex-1 overflow-y-auto p-6">
          {epContent || selectedEp ? (
            isEditable ? (
              <textarea
                className="h-full w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
                value={epContent}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="원고 내용을 입력하세요..."
              />
            ) : (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap dark:prose-invert">
                {epContent}
              </div>
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <FileText className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">회차를 선택하거나 새로 생성하세요.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Right: Consistency check */}
      <div className="flex w-72 shrink-0 flex-col gap-3">
        <Card className="flex-1 border-border/50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">일관성 검증</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {verifying && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                검증 중…
              </div>
            )}
            {consistencyResult && (
              <>
                <div
                  className={`flex items-center gap-2 rounded-lg p-2 text-sm ${
                    consistencyResult.passed
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {consistencyResult.passed ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {consistencyResult.passed ? "통과" : `${consistencyResult.issues.length}건 발견`}
                </div>
                {consistencyResult.issues.map((issue, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border/50 p-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`h-3 w-3 ${
                          issue.severity === "high"
                            ? "text-red-400"
                            : issue.severity === "medium"
                            ? "text-amber-400"
                            : "text-blue-400"
                        }`}
                      />
                      <span className="font-medium">{issue.type}</span>
                      <Badge variant="outline" className="text-[9px]">
                        {issue.severity}
                      </Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      예상: {issue.expected}
                    </p>
                    <p className="text-muted-foreground">실제: {issue.actual}</p>
                    {issue.suggested_fix && (
                      <p className="mt-1 text-primary">
                        <ChevronRight className="mr-0.5 inline h-3 w-3" />
                        {issue.suggested_fix}
                      </p>
                    )}
                  </div>
                ))}
              </>
            )}
            {!verifying && !consistencyResult && (
              <p className="text-xs text-muted-foreground">
                원고 생성 후 자동으로 검증됩니다.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
