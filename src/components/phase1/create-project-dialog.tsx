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
  const [uploadingBible, setUploadingBible] = useState(false);
  const [bibleUploaded, setBibleUploaded] = useState(false);
  const [skipPhase1, setSkipPhase1] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleCreate() {
    if (!title.trim()) return;
    setLoading(true);

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
      setLoading(false);
      return;
    }

    const project = await res.json();

    if (bibleFile) {
      setUploadingBible(true);
      const formData = new FormData();
      formData.append("file", bibleFile);
      formData.append("projectId", project.id);
      const uploadRes = await fetch("/api/ai/parse-bible-upload", {
        method: "POST",
        body: formData,
      });
      if (uploadRes.ok) {
        setBibleUploaded(true);
      }
      setUploadingBible(false);
    }

    if (skipPhase1 && bibleFile) {
      await fetch(`/api/projects/${project.id}/phase`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: 2 }),
      });
      project.phase = 2;
    }

    setLoading(false);
    onCreated(project);
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
                accept=".txt,.md,.json,.pdf"
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
                    파일 선택 (TXT, MD, JSON, PDF)
                  </span>
                  <span className="text-xs">
                    기획서, 캐릭터 설정, 시놉시스 등
                  </span>
                </button>
              )}

              {bibleFile && (
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
                  disabled={loading || uploadingBible}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  이전
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreate}
                  disabled={loading || uploadingBible}
                >
                  {loading || uploadingBible ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      {uploadingBible ? "성경 변환 중…" : "생성 중…"}
                    </>
                  ) : bibleFile ? (
                    "프로젝트 생성 + 성경 변환"
                  ) : (
                    "프로젝트 생성"
                  )}
                </Button>
              </div>

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
