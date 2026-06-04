"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/constants";

export function UserMenu({ name, role }: { name: string; role: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <div className="text-sm font-medium leading-tight">{name}</div>
        <Badge variant="muted" className="mt-0.5">
          {ROLE_LABELS[role] ?? role}
        </Badge>
      </div>
      <form action={logoutAction}>
        <Button variant="ghost" size="icon" aria-label="Sign out" type="submit">
          <LogOut className="size-4" />
        </Button>
      </form>
    </div>
  );
}
