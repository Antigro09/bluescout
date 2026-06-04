"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { requireRole, type RoleName } from "@/lib/auth/guards";
import { TEAM_NUMBER } from "@/lib/constants";

export type AuthState = { error?: string } | undefined;

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Email is required")
  .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email");

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(60),
  email: emailField,
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
});

const ROLES: RoleName[] = [
  "ADMIN",
  "SCOUT_LEAD",
  "SCOUTER",
  "STRATEGIST",
  "VIEWER",
];

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists." };

  // The very first account bootstraps an approved ADMIN.
  const isFirst = (await prisma.user.count()) === 0;
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: isFirst ? "ADMIN" : "SCOUTER",
      approved: isFirst,
      teamNumber: TEAM_NUMBER,
    },
  });

  if (isFirst) {
    await createSession(user.id);
    redirect("/dashboard");
  }
  // Pending approval — send them to login with a notice.
  redirect("/login?pending=1");
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Incorrect email or password." };
  }
  if (!user.active) return { error: "This account has been deactivated." };
  if (!user.approved) {
    return { error: "Your account is awaiting approval from a scout lead." };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

// ---- Lead / admin user management ----

export async function approveUserAction(formData: FormData): Promise<void> {
  await requireRole(["ADMIN", "SCOUT_LEAD"]);
  const userId = String(formData.get("userId"));
  await prisma.user.update({ where: { id: userId }, data: { approved: true } });
  revalidatePath("/admin/users");
}

export async function setUserRoleAction(formData: FormData): Promise<void> {
  await requireRole(["ADMIN", "SCOUT_LEAD"]);
  const userId = String(formData.get("userId"));
  const role = String(formData.get("role")) as RoleName;
  if (!ROLES.includes(role)) return;
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
}

export async function setUserActiveAction(formData: FormData): Promise<void> {
  await requireRole(["ADMIN", "SCOUT_LEAD"]);
  const userId = String(formData.get("userId"));
  const active = formData.get("active") === "true";
  await prisma.user.update({ where: { id: userId }, data: { active } });
  revalidatePath("/admin/users");
}
