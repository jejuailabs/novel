"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  X,
  Upload,
  FileText,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  Sparkles,
} from "lucide-react";

const GENRES = [
  { value: "webnovel", label: "웹소설" },
  { value: "webtoon", label: "웹툰" },
  { value: "drama", label: "드라마" },
  { value: "multi", label: "멀티" },
];

interface Props {
  onClose: () => void;
  onCreated: (project: {
    id: string;
    title: string;
    genre: string;
    phase: number;
    target_length: number | null;
  }) => void;
}

export function CreateProjectDialog({ onClose, onCreated }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("webnovel");
  const [targetLength, setTargetLength] = useState("144");
  const [loading, setLoading] = useState(false);

  const [bibleFile, setBibleFile] = useState<File | null>(null);
  const [manuscriptFiles, setManuscriptFiles] = useState<File[]>([]);
  const [stage, setStage] = useState<
    "idle" | "creating" | "bible" | "manuscript" | "tracker"
  >("idle");
  const [skipPhase1, setSkipPhase1] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const manuscriptRef = useRef<HTMLInputElement>(null);

  const busy = loading || stage !== "idle";

  async function handleCreate() {
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    setStage("creating");

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        genre,
        target_length: parseInt(targetLength) || 144,
      }),
    });

    if (!res.ok) {
      setError(await readError(res, "프로젝트 생성에 실패했습니다."));
      setLoading(false);
      setStage("idle");
      return;
    }

    const project = await res.json();

    if (bibleFile) {
      setStage("bible");
      const formData = new FormData();
      formData.append("file", bibleFile);
      formData.append("projectId", project.id);
      const uploadRes = await fetch("/api/ai/parse-bible-upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        setError(
          await readError(
            uploadRes,
            "성경 변환에 실패했습니다. 파일 없이 생성하거나 다시 시도하세요."
          )
        );
        setLoading(false);
        setStage("idle");
        return;
      }
    }

    if (manuscriptFiles.length > 0) {
      setStage("manuscript");
      const formData = new FormData();
      for (const f of manuscriptFiles) formData.append("files", f);
      const importRes = await fetch(
        `/api/projects/${project.id}/episodes/import`,
        { method: "POST", body: formData }
      );
      if (!importRes.ok) {
        setError(
          await readError(importRes, "원고 업로드에 실패했습니다.")
        );
        setLoading(false);
        setStage("idle");
        return;
      }

      setStage("tracker");
      const trackerRes = await fetch("/api/ai/rebuild-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      if (!trackerRes.ok) {
        setError(
          await readError(
            trackerRes,
            "캐논 트래커 구축에 실패했습니다. 트래커 메뉴에서 다시 시도할 수 있습니다."
          )
        );
        // 원고는 이미 들어갔으므로 중단하지 않고 계속 진행한다.
      }
    }

    // 원고가 있으면 바로 집필 단계로. 없으면 기존 체크박스 정책을 따른다.
    if (manuscriptFiles.length > 0 || (skipPhase1 && bibleFile)) {
      await fetch(`/api/projects/${project.id}/phase`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: 2 }),
      });
      project.phase = 2;
    }

    setLoading(false);
    setStage("idle");
    onCreated(project);
  }

  async function readError(res: Response, fallback: string): Promise<string> {
    try {
      const data = await res.json();
      return data?.error ? String(data.error) : fallback;
    } catch {
      return fallback;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            새 프로젝트
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 pb-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
              step >= 1
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {step > 1 ? <Check className="h-3 w-3" /> : "1"}
          </div>
          <div className="h-px flex-1 bg-border" />
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
              step >= 2
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            2
          </div>
        </div>

        <CardContent>
          {step === 1 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (title.trim()) setStep(2);
              }}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground">
                기본 정보를 입력하세요.
              </p>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  프로젝트 제목
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 한라산의 비밀"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">장르</label>
                <select
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                >
                  {GENRES.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  목표 회차
                </label>
                <Input
                  type="number"
                  value={targetLength}
                  onChange={(e) => setTargetLength(e.target.value)}
                  min={1}
                  max={500}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={!title.trim()}
              >
                다음
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                기존 기획서나 설정 파일이 있으면 업로드하세요. AI가 분석해서
                성경(Bible)으로 자동 변환합니다.
              </p>

              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setBibleFile(f);
                  e.target.value = "";
                }}
              />

              {bibleFile ? (
                <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {bibleFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(bibleFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setBibleFile(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-8 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground active:scale-[0.98]"
                >
                  <Upload className="h-8 w-8" />
                  <span className="text-sm font-medium">
                    파일 선택 (TXT, MD, JSON)
                  </span>
                  <span className="text-xs">
                    기획서, 캐릭터 설정, 시놉시스 등
                  </span>
                </button>
              )}

              {/* 기존 원고 업로드 (연재 이어가기) */}
              <input
                ref={manuscriptRef}
                type="file"
                accept=".txt,.md"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length > 0)
                    setManuscriptFiles((prev) => [...prev, ...files]);
                  e.target.value = "";
                }}
              />

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  기존에 쓴 원고가 있다면 함께 업로드하세요. AI가 원고를
                  분석해 캐논 트래커를 구축하고, 다음 회차부터 바로 이어서
                  집필할 수 있습니다.
                </p>

                {manuscriptFiles.length > 0 && (
                  <div className="max-h-32 space-y-1 overflow-y-auto">
                    {manuscriptFiles.map((f, i) => (
                      <div
                        key={`${f.name}-${i}`}
                        className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2 py-1.5"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 truncate text-xs">
                          {f.name}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setManuscriptFiles((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            )
                          }
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => manuscriptRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground active:scale-[0.98]"
                >
                  <Upload className="h-3.5 w-3.5" />
                  기존 원고 추가 (TXT, MD · 여러 개 가능 · 예: 1부_3화.md)
                </button>

                {manuscriptFiles.length > 0 && (
                  <p className="text-xs text-primary">
                    원고 {manuscriptFiles.length}개 업로드 — 파일명에서 부/화를
                    인식하며, 생성 후 바로 집필 단계(Phase 2)로 진입합니다.
                  </p>
                )}
              </div>

              {bibleFile && manuscriptFiles.length === 0 && (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={skipPhase1}
                    onChange={(e) => setSkipPhase1(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">
                      Phase 1 건너뛰고 바로 Phase 2로
                    </p>
                    <p className="text-xs text-muted-foreground">
                      업로드한 파일로 성경을 구성하고, 바로 원고 생산 단계로
                      진입합니다.
                    </p>
                  </div>
                </label>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                  disabled={busy}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  이전
                </Button>
                <Button className="flex-1" onClick={handleCreate} disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      {stage === "bible"
                        ? "성경 변환 중…"
                        : stage === "manuscript"
                        ? "원고 업로드 중…"
                        : stage === "tracker"
                        ? "캐논 트래커 구축 중…"
                        : "생성 중…"}
                    </>
                  ) : manuscriptFiles.length > 0 ? (
                    "생성 + 원고 분석 + 이어쓰기 준비"
                  ) : bibleFile ? (
                    "프로젝트 생성 + 성경 변환"
                  ) : (
                    "프로젝트 생성"
                  )}
                </Button>
              </div>

              {error && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              {!bibleFile && (
                <p className="text-center text-xs text-muted-foreground">
                  파일 없이도 생성할 수 있습니다. Phase 1에서 브레인스토밍으로
                  시작하세요.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
