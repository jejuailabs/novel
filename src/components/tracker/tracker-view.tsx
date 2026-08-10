"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Target, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Project {
  id: string;
  title: string;
}

export function TrackerView({ projects }: { projects: Project[] }) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(
    projects[0] ?? null
  );
  const [tracker, setTracker] = useState<Record<string, unknown> | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchTracker = useCallback(async (projectId: string) => {
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/tracker`);
    if (res.ok) {
      const data = await res.json();
      setTracker(data.state);
      setEditContent(JSON.stringify(data.state, null, 2));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedProject) fetchTracker(selectedProject.id);
  }, [selectedProject, fetchTracker]);

  async function handleSave() {
    if (!selectedProject) return;
    setSaving(true);
    try {
      const parsed = JSON.parse(editContent);
      await fetch(`/api/projects/${selectedProject.id}/tracker`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: parsed }),
      });
      setTracker(parsed);
    } catch {
      alert("유효한 JSON이 아닙니다.");
    }
    setSaving(false);
  }

  const state = tracker ?? {};
  const timeline = (state as Record<string, unknown>).timeline as Record<string, unknown> | undefined;
  const characters = (state as Record<string, unknown>).characters as Record<string, unknown> | undefined;
  const plotsPlanted = ((state as Record<string, unknown>).plots_planted as unknown[]) ?? [];
  const plotsResolved = ((state as Record<string, unknown>).plots_resolved as unknown[]) ?? [];

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
          저장
        </Button>
      </div>

      <div className="grid flex-1 grid-cols-3 gap-4">
        {/* Summary cards */}
        <div className="space-y-3">
          <Card className="border-border/50">
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4" />
                타임라인
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {timeline && Object.keys(timeline).length > 0 ? (
                <dl className="space-y-1">
                  {Object.entries(timeline).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd>{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-muted-foreground">데이터 없음</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">캐릭터</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {characters && Object.keys(characters).length > 0 ? (
                <ul className="space-y-1">
                  {Object.keys(characters).map((name) => (
                    <li key={name} className="text-muted-foreground">
                      {name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">데이터 없음</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">복선</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="text-muted-foreground">
                심은 복선: {plotsPlanted.length} / 회수: {plotsResolved.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Raw JSON editor */}
        <div className="col-span-2">
          <Card className="h-full border-border/50">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">트래커 JSON</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <textarea
                  className="scrollbar-thin h-[60vh] w-full resize-none rounded-md border border-border bg-background p-4 font-mono text-xs"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
