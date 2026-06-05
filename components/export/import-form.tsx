"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImportForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const text = await file.text();
      JSON.parse(text); // validate it's JSON before sending
      const res = await fetch("/api/import/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      const r = await res.json();
      if (!res.ok) {
        toast.error(r.error ?? "Import failed");
      } else {
        const reports = r.matchReports.inserted + r.matchReports.updated;
        setResult(
          `Restored ${reports} match reports, ${r.pitReports} pit reports, ${r.superNotes} notes, ${r.eventTeams} team stat rows across ${r.matches} matches.`,
        );
        toast.success("Backup restored");
      }
    } catch (err) {
      toast.error("Invalid backup file: " + (err as Error).message);
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onFile}
      />
      <Button
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
        {busy ? "Restoring…" : "Upload backup (.json)"}
      </Button>
      {result && <p className="text-sm text-success">{result}</p>}
    </div>
  );
}
