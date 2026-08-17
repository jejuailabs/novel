"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Upload, FileText, Loader2, Check, BookOpen } from "lucide-react";

interface Props {
  projectId: string;
  onClose: () => void;
  onImported: () => void;
}

// 기존 프로젝트에 외부 원고를 업로드하고 캐논 트래커를 재구축하는 다이얼로그.
// 프로젝트 생성 시점이 아니어도 언제든 연재분을 가져올 수 있다.
export function ImportManuscriptDialog({ projectId, onClose, onImported }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [bibleFile, setBibleFile] = useState<File | null>(null);
  const [stage, setStage] = useState<
    "idle" | "bible" | "manuscript" | "tracker" | "done"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bibleRef = useRef<HTMLInputElement>(null);

  const busy = stage !== "idle" && stage !== "done";

  async function handleImport() {
    if (files.length === 0 && !bibleFile) return;
    setError(null);

    if (bibleFile) {
      setStage("bible");
      const formData = new FormData();
      formData.append("file", bibleFile);
      formData.append("projectId", projectId);
      const res = await fetch("/api/ai/parse-bible-upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        setError(await readError(res, "성경 변환에 실패했습니다."));
        setStage("idle");
        return;
      }
    }

    let importedCount = 0;
    if (files.length > 0) {
      setStage("manuscript");
      const formData = new FormData();
      for (const f of files) formData.append("files", f);
      const res = await fetch(`/api/projects/${projectId}/episodes/import`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        setError(await readError(res, "원고 업로드에 실패했습니다."));
        setStage("idle");
        return;
      }
      const data = await res.json();
      importedCount = data.count ?? files.length;

      setStage("tracker");
      const trackerRes = await fetch("/api/ai/rebuild-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!trackerRes.ok) {
        setError(
          await readError(
            trackerRes,
            "캐논 트래커 구축에 실패했습니다. 잠시 후 다시 시도하세요."
          )
        );
        // 원고는 이미 반영됐으므로 완료 처리하되 오류를 함께 보여준다.
      }
    }

    setResultMsg(
      [
        bibleFile ? "성경 반영 완료" : null,
        importedCount > 0
          ? `원고 ${importedCount}개 반영 + 캐논 트래커 구축 완료`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    );
    setStage("done");
    onImported();
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
            <Upload className="h-4 w-4 text-primary" />
            기존 원고 가져오기
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={busy}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {stage === "done" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400">
                <Check className="h-4 w-4 shrink-0" />
                {resultMsg || "가져오기 완료"}
              </div>
              {error && (
                <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
                  {error}
                </p>
              )}
              <Button className="w-full" onClick={onClose}>
                닫기
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                외부에서 쓴 원고를 업로드하면 승인된 회차로 등록되고, AI가
                원고 전체를 분석해 캐논 트래커를 다시 구축합니다. 이후
                회차부터 일관성을 유지하며 이어서 집필할 수 있습니다.
              </p>

              {/* 성경 파일 (선택) */}
              <input
                ref={bibleRef}
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
                <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5">
                  <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-xs">
                    {bibleFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBibleFile(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => bibleRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground active:scale-[0.98]"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  성경/기획서 파일 (선택 · TXT, MD, JSON · 기존 성경을 덮어씁니다)
                </button>
              )}

              {/* 원고 파일들 */}
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md"
                multiple
                className="hidden"
                onChange={(e) => {
                  const list = Array.from(e.target.files ?? []);
                  if (list.length > 0) setFiles((prev) => [...prev, ...list]);
                  e.target.value = "";
                }}
              />

              {files.length > 0 && (
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {files.map((f, i) => (
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
                          setFiles((prev) => prev.filter((_, idx) => idx !== i))
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
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-border p-6 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground active:scale-[0.98]"
              >
                <Upload className="h-6 w-6" />
                <span className="text-sm font-medium">
                  원고 파일 선택 (TXT, MD · 여러 개 가능)
                </span>
                <span className="text-xs">
                  파일명에서 회차를 인식합니다. 예: 1부_3화.md, 3화.txt
                </span>
              </button>

              <Button
                className="w-full"
                onClick={handleImport}
                disabled={busy || (files.length === 0 && !bibleFile)}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    {stage === "bible"
                      ? "성경 변환 중…"
                      : stage === "manuscript"
                      ? "원고 업로드 중…"
                      : "캐논 트래커 구축 중…"}
                  </>
                ) : (
                  `가져오기${files.length > 0 ? ` (원고 ${files.length}개)` : ""}`
                )}
              </Button>

              {error && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
