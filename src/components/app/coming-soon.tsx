"use client";

import { Construction } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { Card } from "@/components/ui/card";

export function ComingSoon({ titleKey }: { titleKey: DictKey }) {
  const { t } = useT();
  return (
    <Card className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
        <Construction className="h-6 w-6 text-primary" />
      </div>
      <h2 className="text-lg font-semibold">{t(titleKey)}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        이 화면은 다음 이터레이션에서 구현됩니다. (ROADMAP 참조)
      </p>
    </Card>
  );
}
