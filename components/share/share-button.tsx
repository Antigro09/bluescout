"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ShareResult } from "@/lib/share/actions";

export function ShareButton({
  action,
  label = "Share",
}: {
  action: () => Promise<ShareResult>;
  label?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    const res = await action();
    setBusy(false);
    if (res.error) return toast.error(res.error);
    if (res.url) {
      setUrl(res.url);
      try {
        await navigator.clipboard.writeText(res.url);
        toast.success("Read-only link copied to clipboard");
      } catch {
        toast.success("Link created");
      }
    }
  }

  if (url) {
    return (
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="h-8 w-48 rounded-md border border-input bg-background px-2 text-xs"
      />
    );
  }
  return (
    <Button variant="outline" size="sm" onClick={go} disabled={busy}>
      <Share2 className="size-4" />
      {label}
    </Button>
  );
}
