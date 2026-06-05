"use client";

import { useActionState } from "react";
import { Users2 } from "lucide-react";
import { applyLineupAction } from "@/lib/assignments/actions";
import {
  LINEUP_POSITIONS,
  type AssignState,
} from "@/lib/assignments/positions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ScouterOption {
  id: string;
  name: string;
}

export function LineupForm({
  scouters,
  defaults,
}: {
  scouters: ScouterOption[];
  defaults: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<AssignState, FormData>(
    applyLineupAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LINEUP_POSITIONS.map((p) => (
          <div key={p.key} className="space-y-1.5">
            <label
              htmlFor={p.key}
              className={cn(
                "text-sm font-semibold",
                p.alliance === "RED" ? "text-red-500" : "text-blue-500",
              )}
            >
              {p.label}
            </label>
            <select
              id={p.key}
              name={p.key}
              defaultValue={defaults[p.key] ?? ""}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Unassigned —</option>
              {scouters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.message && <p className="text-sm text-success">{state.message}</p>}

      <Button type="submit" disabled={pending}>
        <Users2 className="size-4" />
        {pending ? "Assigning…" : "Assign all qualification matches"}
      </Button>
    </form>
  );
}
