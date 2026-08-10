"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

const GENRES = [
  { value: "webnovel", label: "웹소설" },
  { value: "webtoon", label: "웹툰" },
  { value: "drama", label: "드라마" },
  { value: "multi", label: "멀티" },
];

interface Props {
  onClose: () => void;
  onCreated: (project: { id: string; title: string; genre: string; phase: number; target_length: number | null }) => void;
}

export function CreateProjectDialog({ onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("webnovel");
  const [targetLength, setTargetLength] = useState("144");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

    if (res.ok) {
      const project = await res.json();
      onCreated(project);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>새 프로젝트</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">프로젝트 제목</label>
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
              <label className="mb-1 block text-sm font-medium">목표 회차</label>
              <Input
                type="number"
                value={targetLength}
                onChange={(e) => setTargetLength(e.target.value)}
                min={1}
                max={500}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !title.trim()}>
              {loading ? "생성 중…" : "프로젝트 생성"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
