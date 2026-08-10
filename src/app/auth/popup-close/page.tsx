"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function PopupClosePage() {
  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage({ type: "oauth-complete" }, window.location.origin);
      window.close();
    } else {
      window.location.href = "/dashboard";
    }
  }, []);

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
