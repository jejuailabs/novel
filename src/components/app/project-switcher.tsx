"use client";

import { useState, useEffect, useCallback } from "react";
import { FolderKanban } from "lucide-react";
import {
  useSelectedProject,
  onProjectsChanged,
} from "@/lib/selected-project";

interface Project {
  id: string;
  title: string;
  phase: number;
}

// 상단바 전역 프로젝트 셀렉터.
// 여기서 프로젝트를 바꾸면 Phase 1/2 · 성경 · 트래커 · 일관성 · 지표
// 모든 화면이 같은 프로젝트를 따라간다.
export function ProjectSwitcher() {
  const [projects, setProjects] = useState<Project[]>([]);
  const { selectedProject, selectProject } = useSelectedProject(projects);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) setProjects(await res.json());
    } catch {
      // 상단바 위젯이므로 실패는 조용히 무시
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    return onProjectsChanged(fetchProjects);
  }, [fetchProjects]);

  if (projects.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 pl-2.5">
      <FolderKanban className="h-3.5 w-3.5 shrink-0 text-primary" />
      <select
        className="max-w-[180px] cursor-pointer truncate bg-transparent py-1.5 pr-2 text-xs font-medium outline-none"
        value={selectedProject?.id ?? ""}
        onChange={(e) => {
          const p = projects.find((p) => p.id === e.target.value);
          if (p) selectProject(p);
        }}
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
    </div>
  );
}
