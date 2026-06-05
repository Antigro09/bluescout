import { prisma } from "@/lib/db";
import { TEAM_NUMBER } from "@/lib/constants";

export interface TeamProfile {
  teamNumber: number;
  strengths: string;
  weaknesses: string;
  lookingFor: string;
  notes: string;
}

export const PROFILE_KEY = "teamProfile";

export const EMPTY_PROFILE: TeamProfile = {
  teamNumber: TEAM_NUMBER,
  strengths: "",
  weaknesses: "",
  lookingFor: "",
  notes: "",
};

/** Our team's self-assessment (set by the scout lead), used for AI picks. */
export async function getTeamProfile(): Promise<TeamProfile> {
  const row = await prisma.appSetting.findUnique({ where: { key: PROFILE_KEY } });
  if (!row) return EMPTY_PROFILE;
  const v = (row.value ?? {}) as Partial<TeamProfile>;
  return {
    teamNumber: typeof v.teamNumber === "number" ? v.teamNumber : TEAM_NUMBER,
    strengths: v.strengths ?? "",
    weaknesses: v.weaknesses ?? "",
    lookingFor: v.lookingFor ?? "",
    notes: v.notes ?? "",
  };
}

/** Compact text block for AI prompts; empty string when nothing is set. */
export function profileToPrompt(p: TeamProfile): string {
  const parts: string[] = [];
  if (p.strengths.trim()) parts.push(`- Our strengths: ${p.strengths.trim()}`);
  if (p.weaknesses.trim()) parts.push(`- Our weaknesses: ${p.weaknesses.trim()}`);
  if (p.lookingFor.trim())
    parts.push(`- What we want in a partner: ${p.lookingFor.trim()}`);
  if (p.notes.trim()) parts.push(`- Notes: ${p.notes.trim()}`);
  if (parts.length === 0) return "";
  return `OUR TEAM (${p.teamNumber}):\n${parts.join("\n")}`;
}
