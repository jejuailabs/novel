"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Plus, Sparkles, FileText, Loader2, ChevronDown, Target, CheckCircle2, XCircle, X, Upload, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { CreateProjectDialog } from "./create-project-dialog";
import {
  useSelectedProject,
  notifyProjectsChanged,
} from "@/lib/selected-project";

interface Project {
  id: string;
  title: string;
  genre: string;
  phase: number;
  target_length: number | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Node {
  id: string;
  node_number: string;
  title: string;
  status: string;
  tags: string[];
}

interface BibleData {
  concept_bible?: Record<string, unknown> | null;
  production_bible?: Record<string, unknown> | null;
  creation_log?: Record<string, unknown> | null;
}

function isEmptyBible(o?: Record<string, unknown> | null): boolean {
  return !o || Object.keys(o).length === 0;
}

function bibleSectionText(o?: Record<string, unknown> | null): string | null {
  if (isEmptyBible(o)) return null;
  return Object.entries(o!)
    .map(
      ([k, v]) =>
        `${k}: ${typeof v === "string" ? v : JSON.stringify(v, null, 2)}`
    )
    .join("\n\n");
}

interface JudgmentCheck {
  name: string;
  passed: boolean;
  actual?: string;
  required?: string;
  missing?: string;
}

interface JudgmentResult {
  ready: boolean;
  score: number;
  checks: JudgmentCheck[];
  gaps: string[];
  recommendations: string[];
}

interface VolumeResult {
  webnovel_episodes: number;
  webtoon_episodes: number;
  drama_episodes: number;
  movies: number;
  confidence: number;
  notes: string;
}

const NODE_STATUSES = ["확정", "진화중", "보류", "폐기"] as const;

export function Phase1View({ projects }: { projects: Project[] }) {
  const { t } = useT();
  const router = useRouter();
  const { selectedProject, selectProject } = useSelectedProject(projects);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [bible, setBible] = useState<BibleData | null>(null);
  const [bibleLoading, setBibleLoading] = useState(false);
  const [bibleUploading, setBibleUploading] = useState(false);
  const bibleFileRef = useRef<HTMLInputElement>(null);
  const [showJudgment, setShowJudgment] = useState(false);
  const [judgmentLoading, setJudgmentLoading] = useState(false);
  const [judgmentResult, setJudgmentResult] = useState<JudgmentResult | null>(null);
  const [volumeResult, setVolumeResult] = useState<VolumeResult | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchNodes = useCallback(async (projectId: string) => {
    const res = await fetch(`/api/projects/${projectId}/nodes`);
    if (res.ok) {
      const data = await res.json();
      setNodes(data);
    }
  }, []);

  const fetchBible = useCallback(async (projectId: string) => {
    setBibleLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/bible`);
      if (res.ok) {
        const data = await res.json();
        setBible(data);
      }
    } finally {
      setBibleLoading(false);
    }
  }, []);

  async function handleBibleUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일을 다시 선택할 수 있도록 초기화
    if (!file || !selectedProject) return;
    if (
      !window.confirm(
        `"${file.name}" 파일을 성경으로 변환합니다. 기존 성경이 있으면 덮어쓰입니다. 계속할까요?`
      )
    )
      return;

    setBibleUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", selectedProject.id);
      const res = await fetch("/api/ai/parse-bible-upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`성경 변환 실패: ${err.error ?? "알 수 없는 오류"}`);
      } else {
        await fetchBible(selectedProject.id);
      }
    } catch {
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setBibleUploading(false);
    }
  }

  const handleStatusChange = useCallback(
    async (node: Node, newStatus: string) => {
      if (!selectedProject || node.status === newStatus) return;

      const res = await fetch(
        `/api/projects/${selectedProject.id}/nodes/${node.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!res.ok) return;

      if (newStatus === "확정") {
        await fetch("/api/ai/promote-bible", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: selectedProject.id, nodeId: node.id }),
        });
        fetchBible(selectedProject.id);
      }

      fetchNodes(selectedProject.id);
    },
    [selectedProject, fetchNodes, fetchBible]
  );

  useEffect(() => {
    if (selectedProject) {
      fetchNodes(selectedProject.id);
      fetchBible(selectedProject.id);
      setMessages([]);
      setSessionId(null);
    }
  }, [selectedProject, fetchNodes, fetchBible]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  async function handleJudgment() {
    if (!selectedProject || judgmentLoading) return;
    setShowJudgment(true);
    setJudgmentLoading(true);
    setJudgmentResult(null);
    setVolumeResult(null);

    try {
      const [judgmentRes, volumeRes] = await Promise.all([
        fetch("/api/ai/judge-completion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: selectedProject.id }),
        }),
        fetch("/api/ai/volume-calculator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: selectedProject.id }),
        }),
      ]);

      if (judgmentRes.ok) {
        setJudgmentResult(await judgmentRes.json());
      }
      if (volumeRes.ok) {
        setVolumeResult(await volumeRes.json());
      }
    } catch (err) {
      console.error("Judgment failed:", err);
    } finally {
      setJudgmentLoading(false);
    }
  }

  async function handlePhase2Transition() {
    if (!selectedProject) return;
    const res = await fetch(`/api/projects/${selectedProject.id}/phase`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase: 2 }),
    });
    if (res.ok) {
      router.push("/phase2");
    }
  }

  async function handleSend() {
    if (!input.trim() || !selectedProject || streaming) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setStreaming(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/ai/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject.id,
          sessionId,
          message: userMsg,
        }),
      });

      if (!res.ok) throw new Error("Stream failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader");

      let buffer = "";
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
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + data.text,
                };
              }
              return updated;
            });
          }

          if (data.done) {
            if (data.sessionId) setSessionId(data.sessionId);
          }
        }
      }

      // 노드 자동 추출
      if (sessionId || true) {
        fetch("/api/ai/extract-nodes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: selectedProject.id,
            sessionId: sessionId,
          }),
        }).then(() => fetchNodes(selectedProject.id));
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `오류가 발생했습니다: ${err}`,
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  function handleProjectCreated(project: Project) {
    selectProject(project);
    notifyProjectsChanged();
    setShowCreate(false);
    router.refresh();
  }

  const statusColor: Record<string, string> = {
    확정: "bg-emerald-500/20 text-emerald-400",
    진화중: "bg-violet-500/20 text-violet-400",
    보류: "bg-amber-500/20 text-amber-400",
    폐기: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="flex h-full gap-4">
      {/* Left: Nodes */}
      <div className="flex w-72 shrink-0 flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {t("dashboard.nodes")} ({nodes.length})
          </h3>
          <Button size="sm" variant="ghost" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto">
          {nodes.map((node) => (
            <Card key={node.id} className="border-border/50">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs text-muted-foreground">
                      {node.node_number}
                    </span>
                    <p className="text-sm font-medium">{node.title}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${statusColor[node.status] ?? ""}`}
                      >
                        {node.status}
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[100px]">
                      {NODE_STATUSES.map((s) => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() => handleStatusChange(node, s)}
                          className={`text-xs ${node.status === s ? "font-semibold" : ""}`}
                        >
                          <span
                            className={`mr-2 inline-block h-2 w-2 rounded-full ${
                              {
                                확정: "bg-emerald-500",
                                진화중: "bg-violet-500",
                                보류: "bg-amber-500",
                                폐기: "bg-red-500",
                              }[s]
                            }`}
                          />
                          {s}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {node.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-[10px]"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Progress gauge */}
        {nodes.length > 0 && (() => {
          const confirmedCount = nodes.filter((n) => n.status === "확정").length;
          const pct = Math.round((confirmedCount / nodes.length) * 100);
          return (
            <div className="space-y-1.5 border-t border-border/50 pt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>확정 {confirmedCount} / {nodes.length}</span>
                <span>{pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })()}

        {/* Phase 2 진입 판정 button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          disabled={nodes.length === 0 || judgmentLoading}
          onClick={handleJudgment}
        >
          {judgmentLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Target className="h-4 w-4" />
          )}
          Phase 2 진입 판정
        </Button>
      </div>

      {/* Center: Chat */}
      <Card className="flex min-w-0 flex-1 flex-col border-border/50">
        <CardHeader className="border-b border-border/50 py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("dashboard.brainstorm")}
          </CardTitle>
        </CardHeader>

        <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <Sparkles className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">키워드나 아이디어를 입력하면 브레인스토밍이 시작됩니다.</p>
            </div>
          )}
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.role === "assistant" &&
                    streaming &&
                    i === messages.length - 1 &&
                    msg.content === "" && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border/50 p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("dashboard.inputPlaceholder")}
              disabled={streaming || !selectedProject}
              className="flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={streaming || !input.trim() || !selectedProject}
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>

      {/* Right: Bible preview */}
      <div className="flex w-64 shrink-0 flex-col gap-3">
        <Card className="flex-1 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between gap-2 py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              {t("dashboard.biblePreview")}
            </CardTitle>
            <input
              ref={bibleFileRef}
              type="file"
              accept=".txt,.md,.json"
              className="hidden"
              onChange={handleBibleUpload}
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-xs"
              disabled={!selectedProject || bibleUploading}
              onClick={() => bibleFileRef.current?.click()}
              title="파일을 업로드해 성경으로 변환합니다 (기존 성경은 덮어쓰기)"
            >
              {bibleUploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              {bibleUploading ? "변환 중" : "업로드"}
            </Button>
          </CardHeader>
          <CardContent className="scrollbar-thin overflow-y-auto text-xs text-muted-foreground">
            {!selectedProject ? (
              <p>프로젝트를 먼저 선택하세요.</p>
            ) : bibleLoading ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : !bible ||
              (isEmptyBible(bible.concept_bible) &&
                isEmptyBible(bible.production_bible) &&
                isEmptyBible(bible.creation_log)) ? (
              <div className="space-y-3 py-2">
                <p>아직 성경 데이터가 없습니다.</p>
                <p className="text-muted-foreground/70">
                  기획서·설정 파일을 업로드해 성경으로 변환하거나, 브레인스토밍으로
                  노드를 확정하면 자동으로 반영됩니다.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1.5"
                  disabled={bibleUploading}
                  onClick={() => bibleFileRef.current?.click()}
                >
                  {bibleUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  성경 파일 업로드
                </Button>
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-1.5 text-xs text-primary hover:underline"
                  onClick={() => router.push("/bible")}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  성경 편집기 열기
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {bibleSectionText(bible.concept_bible) && (
                  <div>
                    <h4 className="mb-1 font-semibold text-foreground">컨셉 성경</h4>
                    <p className="whitespace-pre-wrap">
                      {bibleSectionText(bible.concept_bible)}
                    </p>
                  </div>
                )}
                {bibleSectionText(bible.production_bible) && (
                  <div>
                    <h4 className="mb-1 font-semibold text-foreground">
                      프로덕션 성경
                    </h4>
                    <p className="whitespace-pre-wrap">
                      {bibleSectionText(bible.production_bible)}
                    </p>
                  </div>
                )}
                {bibleSectionText(bible.creation_log) && (
                  <div>
                    <h4 className="mb-1 font-semibold text-foreground">로그</h4>
                    <p className="whitespace-pre-wrap">
                      {bibleSectionText(bible.creation_log)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showCreate && (
        <CreateProjectDialog
          onClose={() => setShowCreate(false)}
          onCreated={handleProjectCreated}
        />
      )}

      {/* Phase 2 진입 판정 Modal */}
      {showJudgment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !judgmentLoading && setShowJudgment(false)}
          />
          <div className="relative z-10 mx-4 flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl border border-border bg-card shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">
                Phase 2 진입 판정
              </h2>
              <button
                onClick={() => !judgmentLoading && setShowJudgment(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">
              {judgmentLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    AI가 프로젝트를 분석하고 있습니다...
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Score */}
                  {judgmentResult && (
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={`flex h-20 w-20 items-center justify-center rounded-full border-4 ${
                          judgmentResult.ready
                            ? "border-emerald-500 text-emerald-400"
                            : "border-amber-500 text-amber-400"
                        }`}
                      >
                        <span className="text-2xl font-bold">
                          {judgmentResult.score}%
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          judgmentResult.ready
                            ? "border-emerald-500/50 text-emerald-400"
                            : "border-amber-500/50 text-amber-400"
                        }
                      >
                        {judgmentResult.ready ? "준비 완료" : "미완료"}
                      </Badge>
                    </div>
                  )}

                  {/* Checks */}
                  {judgmentResult && judgmentResult.checks.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-foreground">
                        점검 항목
                      </h3>
                      <div className="space-y-1.5">
                        {judgmentResult.checks.map((check, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 rounded-md bg-muted/30 px-3 py-2 text-xs"
                          >
                            {check.passed ? (
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                            ) : (
                              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                            )}
                            <div>
                              <span className="font-medium text-foreground">
                                {check.name}
                              </span>
                              {check.actual && (
                                <span className="ml-1 text-muted-foreground">
                                  ({check.actual}
                                  {check.required && ` / 필요: ${check.required}`})
                                </span>
                              )}
                              {check.missing && (
                                <p className="mt-0.5 text-red-400">
                                  누락: {check.missing}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Gaps */}
                  {judgmentResult &&
                    !judgmentResult.ready &&
                    judgmentResult.gaps.length > 0 && (
                      <div>
                        <h3 className="mb-2 text-sm font-semibold text-foreground">
                          부족한 부분
                        </h3>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {judgmentResult.gaps.map((gap, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="shrink-0 text-amber-400">-</span>
                              {gap}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {/* Recommendations */}
                  {judgmentResult &&
                    !judgmentResult.ready &&
                    judgmentResult.recommendations.length > 0 && (
                      <div>
                        <h3 className="mb-2 text-sm font-semibold text-foreground">
                          권장 사항
                        </h3>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {judgmentResult.recommendations.map((rec, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="shrink-0 text-primary">-</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {/* Volume Estimates */}
                  {volumeResult && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-foreground">
                        분량 추정
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "웹소설", value: `${volumeResult.webnovel_episodes}화` },
                          { label: "웹툰", value: `${volumeResult.webtoon_episodes}화` },
                          { label: "드라마", value: `${volumeResult.drama_episodes}화` },
                          { label: "영화", value: `${volumeResult.movies}편` },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="rounded-md bg-muted/30 px-3 py-2 text-center"
                          >
                            <p className="text-lg font-bold text-foreground">
                              {item.value}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {item.label}
                            </p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        신뢰도 {volumeResult.confidence}%
                        {volumeResult.notes && ` · ${volumeResult.notes}`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {!judgmentLoading && judgmentResult && (
              <div className="border-t border-border/50 px-5 py-3">
                {judgmentResult.ready ? (
                  <Button
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                    onClick={handlePhase2Transition}
                  >
                    <Target className="h-4 w-4" />
                    Phase 2 시작
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowJudgment(false)}
                  >
                    돌아가서 보완하기
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
