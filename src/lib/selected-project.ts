"use client";

import { useState, useEffect, useCallback } from "react";

// 전역 프로젝트 선택 상태.
// localStorage에 저장해 페이지 이동/새로고침에도 유지되고,
// 커스텀 이벤트로 상단바 셀렉터와 각 화면이 실시간 동기화된다.

const STORAGE_KEY = "ff:selectedProjectId";
const SELECT_EVENT = "ff:selected-project-changed";
const PROJECTS_EVENT = "ff:projects-changed";

export function getStoredProjectId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function storeProjectId(id: string) {
  localStorage.setItem(STORAGE_KEY, id);
  window.dispatchEvent(new CustomEvent(SELECT_EVENT, { detail: id }));
}

// 프로젝트 생성/삭제 후 호출하면 상단바 셀렉터가 목록을 다시 불러온다.
export function notifyProjectsChanged() {
  window.dispatchEvent(new Event(PROJECTS_EVENT));
}

export function onProjectsChanged(handler: () => void): () => void {
  window.addEventListener(PROJECTS_EVENT, handler);
  return () => window.removeEventListener(PROJECTS_EVENT, handler);
}

export function useSelectedProject<T extends { id: string }>(projects: T[]) {
  const [selectedProject, setSelectedState] = useState<T | null>(null);

  useEffect(() => {
    const apply = (id: string | null) => {
      const found =
        (id ? projects.find((p) => p.id === id) : undefined) ??
        projects[0] ??
        null;
      setSelectedState(found);
    };
    apply(getStoredProjectId());

    const onChange = (e: Event) => apply((e as CustomEvent<string>).detail);
    window.addEventListener(SELECT_EVENT, onChange);
    return () => window.removeEventListener(SELECT_EVENT, onChange);
  }, [projects]);

  const selectProject = useCallback((p: T) => {
    setSelectedState(p);
    storeProjectId(p.id);
  }, []);

  return { selectedProject, selectProject } as const;
}
