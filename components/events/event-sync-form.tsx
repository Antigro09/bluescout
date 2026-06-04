"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { syncEventAction, type SyncState } from "@/lib/events/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EventSyncForm() {
  const [state, action, pending] = useActionState<SyncState, FormData>(
    syncEventAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input
          name="eventKey"
          placeholder="TBA event key (e.g. 2026wabon)"
          className="max-w-xs"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
        <Button type="submit" disabled={pending}>
          <RefreshCw className={pending ? "animate-spin" : ""} />
          {pending ? "Syncing…" : "Sync event"}
        </Button>
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.message && (
        <p className="text-sm text-success">{state.message}</p>
      )}
    </form>
  );
}
