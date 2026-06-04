"use client";

import {
  approveUserAction,
  setUserRoleAction,
  setUserActiveAction,
} from "@/lib/auth/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, ROLE_ORDER } from "@/lib/constants";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  approved: boolean;
  active: boolean;
}

export function UserAdminRow({
  user,
  isSelf,
}: {
  user: AdminUser;
  isSelf: boolean;
}) {
  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="px-6 py-3">
        <div className="font-medium">{user.name}</div>
        <div className="text-xs text-muted-foreground">{user.email}</div>
      </td>
      <td className="px-6 py-3">
        <form action={setUserRoleAction}>
          <input type="hidden" name="userId" value={user.id} />
          <select
            name="role"
            defaultValue={user.role}
            disabled={isSelf}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
          >
            {ROLE_ORDER.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </form>
      </td>
      <td className="px-6 py-3">
        {user.approved ? (
          <Badge variant={user.active ? "success" : "muted"}>
            {user.active ? "Active" : "Inactive"}
          </Badge>
        ) : (
          <Badge variant="warning">Pending</Badge>
        )}
      </td>
      <td className="px-6 py-3">
        <div className="flex justify-end gap-2">
          {!user.approved && (
            <form action={approveUserAction}>
              <input type="hidden" name="userId" value={user.id} />
              <Button size="sm" type="submit">
                Approve
              </Button>
            </form>
          )}
          {!isSelf && (
            <form action={setUserActiveAction}>
              <input type="hidden" name="userId" value={user.id} />
              <input
                type="hidden"
                name="active"
                value={(!user.active).toString()}
              />
              <Button size="sm" variant="ghost" type="submit">
                {user.active ? "Deactivate" : "Activate"}
              </Button>
            </form>
          )}
        </div>
      </td>
    </tr>
  );
}
