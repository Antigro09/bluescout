import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { isAIEnabled } from "@/lib/ai/provider";
import { PageHeader } from "@/components/app/page-header";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { AskAssistant } from "@/components/ai/ask-assistant";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Ask AI" };

export default async function AskPage() {
  await requireUser();
  const enabled = isAIEnabled();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ask AI"
        subtitle="Natural-language questions over your scouting + EPA data."
        action={<DashboardNav />}
      />
      {enabled ? (
        <AskAssistant />
      ) : (
        <Card>
          <CardContent className="space-y-2 py-8 text-center">
            <Sparkles className="mx-auto size-6 text-primary" />
            <p className="font-medium">AI features are ready, but switched off.</p>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              To enable natural-language Q&amp;A, note summaries, and picklist
              suggestions, set <code className="rounded bg-muted px-1">AI_ENABLED=true</code>,
              choose <code className="rounded bg-muted px-1">AI_PROVIDER</code>{" "}
              (anthropic / openai / ollama), and add the matching key in your{" "}
              <code className="rounded bg-muted px-1">.env</code>. No code changes
              needed.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
