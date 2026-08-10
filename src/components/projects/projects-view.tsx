"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateProjectDialog } from "@/components/phase1/create-project-dialog";

interface Project {
  id: string;
  title: string;
  genre: string;
  phase: number;
  target_length: number | null;
  created_at: string;
  updated_at: string;
}

const genreLabel: Record<string, string> = {
  webnovel: "웹소설",
  webtoon: "웹툰",
  drama: "드라마",
  multi: "멀티",
};

export function ProjectsView({ projects: initial }: { projects: Project[] }) {
  const router = useRouter();
  const [projects, setProjects] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);

  async function handleDelete(id: string) {
    if (!confirm("이 프로젝트를 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">프로젝트</h2>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />
          새 프로젝트
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FolderOpen className="mb-3 h-10 w-10 opacity-30" />
            <p>프로젝트가 없습니다. 새 프로젝트를 만들어 시작하세요.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card
              key={p.id}
              className="cursor-pointer border-border/50 transition-colors hover:border-primary/30"
              onClick={() => router.push("/phase1")}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{p.title}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {genreLabel[p.genre] ?? p.genre}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${
                          p.phase === 1
                            ? "bg-violet-500/20 text-violet-400"
                            : "bg-teal-500/20 text-teal-400"
                        }`}
                      >
                        Phase {p.phase}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      목표 {p.target_length ?? 144}화 ·{" "}
                      {new Date(p.updated_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(p.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectDialog
          onClose={() => setShowCreate(false)}
          onCreated={(project) => {
            setShowCreate(false);
            setProjects((prev) => [
              {
                ...project,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              ...prev,
            ]);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
