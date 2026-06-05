"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Sparkles, Loader2 } from "lucide-react";
import {
  addSuperNoteAction,
  deleteSuperNoteAction,
} from "@/lib/scouting/pit-actions";
import { summarizeTeamNotesAction } from "@/lib/ai/actions";
import { Textarea, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface SuperNote {
  id: string;
  content: string;
  tags: string[];
  aiSummary: string | null;
  authorName: string | null;
  scoutedAt: string;
}

export function SuperNotes({
  teamNumber,
  notes,
}: {
  teamNumber: number;
  notes: SuperNote[];
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  async function summarize() {
    setSummarizing(true);
    const res = await summarizeTeamNotesAction(teamNumber);
    setSummarizing(false);
    if (res.error) toast.error(res.error);
    else if (res.summary) setAiSummary(res.summary);
  }

  async function add() {
    if (!content.trim()) return;
    setBusy(true);
    const res = await addSuperNoteAction(
      teamNumber,
      content,
      tags.split(",").map((t) => t.trim()).filter(Boolean),
    );
    setBusy(false);
    if (res.error) toast.error(res.error);
    else {
      setContent("");
      setTags("");
      router.refresh();
    }
  }

  async function remove(id: string) {
    await deleteSuperNoteAction(id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Strategy observations, strengths, weaknesses, how they play with partners…"
        />
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Tags (comma-separated): defense, fast-cycle, …"
        />
        <Button onClick={add} disabled={busy || !content.trim()} size="sm">
          {busy ? "Saving…" : "Add note"}
        </Button>
      </div>

      {notes.length > 0 && (
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={summarize}
            disabled={summarizing}
          >
            {summarizing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Summarize with AI
          </Button>
          {aiSummary && (
            <p className="flex items-start gap-1.5 rounded-md bg-primary/5 p-2 text-sm">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
              {aiSummary}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        {notes.length === 0 && (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        )}
        {notes.map((n) => (
          <div
            key={n.id}
            className="rounded-lg border border-border bg-card/50 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="whitespace-pre-wrap text-sm">{n.content}</p>
              <button
                onClick={() => remove(n.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
                aria-label="delete note"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            {n.aiSummary && (
              <p className="mt-2 flex items-start gap-1.5 rounded bg-primary/5 p-2 text-xs text-muted-foreground">
                <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" />
                {n.aiSummary}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {n.tags.map((t) => (
                <Badge key={t} variant="muted">
                  {t}
                </Badge>
              ))}
              <span className="ml-auto text-xs text-muted-foreground">
                {n.authorName ?? "Unknown"} ·{" "}
                {new Date(n.scoutedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
