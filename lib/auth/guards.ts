import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import type { User } from "@/lib/generated/prisma/client";

export type RoleName =
  | "ADMIN"
  | "SCOUT_LEAD"
  | "SCOUTER"
  | "STRATEGIST"
  | "VIEWER";

export async function getCurrentUser(): Promise<User | null> {
  return getSessionUser();
}

/** Require an authenticated user, else redirect to login. */
export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Require one of the given roles, else bounce to the dashboard. */
export async function requireRole(roles: readonly RoleName[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role as RoleName)) redirect("/dashboard");
  return user;
}

export function isLead(user: { role: string }): boolean {
  return user.role === "ADMIN" || user.role === "SCOUT_LEAD";
}

export function canStrategize(user: { role: string }): boolean {
  return (
    user.role === "ADMIN" ||
    user.role === "SCOUT_LEAD" ||
    user.role === "STRATEGIST"
  );
}
