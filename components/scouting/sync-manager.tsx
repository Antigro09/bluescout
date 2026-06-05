"use client";

import { useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { flushQueue, pendingCount } from "@/lib/offline/sync";
import { cn } from "@/lib/utils";

/** Mounted app-wide: stores identity, flushes the offline queue, shows status. */
export function SyncManager({ userId }: { userId: string }) {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    localStorage.setItem("bluescout_uid", userId);
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    setOnline(navigator.onLine);

    async function refresh() {
      if (mounted) setPending(await pendingCount());
    }
    async function trySync() {
      setOnline(navigator.onLine);
      if (navigator.onLine) await flushQueue();
      await refresh();
    }

    void trySync();
    const onOnline = () => void trySync();
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const iv = setInterval(() => void trySync(), 20_000);

    return () => {
      mounted = false;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(iv);
    };
  }, []);

  if (online && pending === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-lg",
        online ? "border-primary/30 bg-card" : "border-warning/40 bg-warning/10",
      )}
    >
      {online ? (
        <RefreshCw className="size-3.5 animate-spin text-primary" />
      ) : (
        <CloudOff className="size-3.5 text-warning" />
      )}
      {online ? `Syncing ${pending}…` : `Offline · ${pending} queued`}
    </div>
  );
}
