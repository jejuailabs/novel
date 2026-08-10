"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

interface Metric {
  input_tokens: number;
  output_tokens: number;
  cost_krw: number;
}

interface AlertItem {
  id: string;
  type: "spike" | "context-limit";
  message: string;
  severity: "warning" | "critical";
}

export function Alerts({ metrics }: { metrics: Metric[] }) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    const newAlerts: AlertItem[] = [];

    if (metrics.length > 0) {
      // Token spike: latest call used 50K+ tokens
      const latest = metrics[metrics.length - 1];
      const latestTotal = latest.input_tokens + latest.output_tokens;
      if (latestTotal >= 50_000) {
        newAlerts.push({
          id: "spike",
          type: "spike",
          message: `최근 호출에서 ${latestTotal.toLocaleString()}개 토큰이 사용되었습니다. 비용에 주의하세요.`,
          severity: "warning",
        });
      }

      // Context limit approaching: total tokens > 120K
      const totalTokens = metrics.reduce(
        (sum, m) => sum + m.input_tokens + m.output_tokens,
        0
      );
      if (totalTokens > 120_000) {
        newAlerts.push({
          id: "context-limit",
          type: "context-limit",
          message: `누적 토큰 ${totalTokens.toLocaleString()}개로 컨텍스트 한도에 근접하고 있습니다.`,
          severity: "critical",
        });
      }
    }

    setAlerts(newAlerts);
  }, [metrics]);

  function dismiss(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm ${
            alert.severity === "critical"
              ? "border-red-500/50 bg-red-950/80 text-red-200"
              : "border-amber-500/50 bg-amber-950/80 text-amber-200"
          }`}
          style={{ maxWidth: 380 }}
        >
          <AlertTriangle
            className={`mt-0.5 h-4 w-4 shrink-0 ${
              alert.severity === "critical" ? "text-red-400" : "text-amber-400"
            }`}
          />
          <p className="flex-1 text-sm">{alert.message}</p>
          <button
            onClick={() => dismiss(alert.id)}
            className="shrink-0 rounded p-0.5 hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
