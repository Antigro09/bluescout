"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

const SUGGESTIONS = [
  "Which teams have the best auto and a reliable L3 climb?",
  "Who are the most consistent scorers we haven't scouted much?",
  "Best defensive partners for a high-scoring alliance?",
];

export function AskAssistant() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(q?: string) {
    const text = (q ?? question).trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Request failed");
      else setAnswer(data.answer);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 py-5">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about your teams…"
            className="min-h-24"
          />
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setQuestion(s);
                  void ask(s);
                }}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
          <Button onClick={() => ask()} disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Ask
          </Button>
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {answer && (
        <Card>
          <CardContent className="py-5">
            <p className="whitespace-pre-wrap text-sm">{answer}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
