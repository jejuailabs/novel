"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Save, Book, Loader2, History, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n";

interface Project {
  id: string;
  title: string;
}

interface Revision {
  id: string;
  version: number;
  change_summary: string | null;
  created_at: string;
  snapshot?: Record<string, unknown>;
}

export function BibleView({ projects }: { projects: Project[] }) {
  const { t } = useT();
  const [selectedProject, setSelectedProject] = useState<Project | null>(
    projects[0] ?? null
  );
  const [bible, setBible] = useState<{
    concept_bible: Record<string, unknown>;
    production_bible: Record<string, unknown>;
    creation_log: Record<string, unknown>;
  } | null>(null);
  const [activeTab, setActiveTab] = useState("concept");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState<Revision | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBible = useCallback(async (projectId: string) => {
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/bible`);
    if (res.ok) {
      const data = await res.json();
      setBible(data);
      setEditContent(JSON.stringify(data.concept_bible, null, 2));
    }
    setLoading(false);
  }, []);

  const fetchRevisions = useCallback(async (projectId: string) => {
    setRevisionsLoading(true);
    const res = await fetch(`/api/projects/${projectId}/bible/revisions`);
    if (res.ok) {
      const data = await res.json();
      setRevisions(data);
    }
    setRevisionsLoading(false);
  }, []);

  useEffect(() => {
    if (selectedProject) fetchBible(selectedProject.id);
  }, [selectedProject, fetchBible]);

  useEffect(() => {
    if (selectedProject && showRevisions) fetchRevisions(selectedProject.id);
  }, [selectedProject, showRevisions, fetchRevisions]);

  useEffect(() => {
    if (!bible) return;
    const content =
      activeTab === "concept"
        ? bible.concept_bible
        : activeTab === "production"
        ? bible.production_bible
        : bible.creation_log;
    setEditContent(JSON.stringify(content, null, 2));
  }, [activeTab, bible]);

  async function handleSave() {
    if (!selectedProject) return;
    const summary = prompt("변경 사항 요약 (선택):");
    setSaving(true);
    try {
      const parsed = JSON.parse(editContent);
      await fetch(`/api/projects/${selectedProject.id}/bible`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bible_type: activeTab,
          content: parsed,
          change_summary: summary || undefined,
        }),
      });
      await fetchBible(selectedProject.id);
      if (showRevisions) await fetchRevisions(selectedProject.id);
    } catch {
      alert("유효한 JSON이 아닙니다.");
    }
    setSaving(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setShowUploadConfirm(true);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  async function handleUploadConfirm() {
    if (!selectedProject || !pendingFile) return;
    setShowUploadConfirm(false);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", pendingFile);
      formData.append("projectId", selectedProject.id);
      const res = await fetch("/api/ai/parse-bible-upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`업로드 실패: ${err.error ?? "알 수 없는 오류"}`);
      } else {
        await fetchBible(selectedProject.id);
      }
    } catch {
      alert("업로드 중 오류가 발생했습니다.");
    }
    setPendingFile(null);
    setUploading(false);
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-4">
        <select
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
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
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Save className="mr-1 h-3 w-3" />
          )}
          {t("action.save")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Upload className="mr-1 h-3 w-3" />
          )}
          {uploading ? "변환 중..." : "업로드"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.json,.pdf"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          size="sm"
          variant={showRevisions ? "secondary" : "outline"}
          onClick={() => {
            setShowRevisions((v) => !v);
            setSelectedRevision(null);
          }}
        >
          <History className="mr-1 h-3 w-3" />
          버전 이력
        </Button>
      </div>

      <Card className="flex-1 border-border/50">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Book className="h-4 w-4" />
            성경 (Bible)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-[calc(100%-3rem)] flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="concept">
                {t("dashboard.bible.concept")}
              </TabsTrigger>
              <TabsTrigger value="production">
                {t("dashboard.bible.production")}
              </TabsTrigger>
              <TabsTrigger value="log">
                {t("dashboard.bible.log")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <textarea
                  className="scrollbar-thin h-[60vh] w-full resize-none rounded-md border border-border bg-background p-4 font-mono text-xs"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {showRevisions && (
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              버전 이력
            </CardTitle>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => {
                setShowRevisions(false);
                setSelectedRevision(null);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {revisionsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : revisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">버전 이력이 없습니다.</p>
            ) : (
              <div className="space-y-1">
                {revisions.map((rev) => (
                  <button
                    key={rev.id}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                      selectedRevision?.id === rev.id ? "bg-muted" : ""
                    }`}
                    onClick={() =>
                      setSelectedRevision(
                        selectedRevision?.id === rev.id ? null : rev
                      )
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">v{rev.version}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(rev.created_at).toLocaleString("ko-KR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {rev.change_summary && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {rev.change_summary}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showUploadConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader className="py-3">
              <CardTitle className="text-base">파일 업로드 확인</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <strong>{pendingFile?.name}</strong> 파일을 성경으로 변환합니다.
                기존 성경이 덮어쓰입니다.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowUploadConfirm(false);
                    setPendingFile(null);
                  }}
                >
                  취소
                </Button>
                <Button size="sm" onClick={handleUploadConfirm}>
                  확인
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedRevision && (
        <Card className="border-border/50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">
              v{selectedRevision.version} 스냅샷 vs 현재
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  v{selectedRevision.version} (이전)
                </p>
                <pre className="scrollbar-thin max-h-[40vh] overflow-auto rounded-md border border-border bg-muted/50 p-3 font-mono text-xs">
                  {JSON.stringify(selectedRevision.snapshot, null, 2)}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  현재
                </p>
                <pre className="scrollbar-thin max-h-[40vh] overflow-auto rounded-md border border-border bg-muted/50 p-3 font-mono text-xs">
                  {bible ? JSON.stringify(bible, null, 2) : ""}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
