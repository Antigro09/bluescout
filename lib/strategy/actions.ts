"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { PROFILE_KEY, type TeamProfile } from "@/lib/strategy/profile";

export type ProfileState = { error?: string; ok?: boolean };

export async function saveTeamProfileAction(
  input: TeamProfile,
): Promise<ProfileState> {
  await requireRole(["ADMIN", "SCOUT_LEAD"]);
  const clean: TeamProfile = {
    teamNumber: Number(input.teamNumber) || 1086,
    strengths: String(input.strengths ?? "").slice(0, 2000),
    weaknesses: String(input.weaknesses ?? "").slice(0, 2000),
    lookingFor: String(input.lookingFor ?? "").slice(0, 2000),
    notes: String(input.notes ?? "").slice(0, 2000),
  };
  await prisma.appSetting.upsert({
    where: { key: PROFILE_KEY },
    create: { key: PROFILE_KEY, value: clean as unknown as Prisma.InputJsonObject },
    update: { value: clean as unknown as Prisma.InputJsonObject },
  });
  revalidatePath("/admin/strategy");
  return { ok: true };
}
