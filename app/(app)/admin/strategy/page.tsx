import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guards";
import { getTeamProfile } from "@/lib/strategy/profile";
import { PageHeader } from "@/components/app/page-header";
import { ProfileForm } from "@/components/strategy/profile-form";

export const metadata: Metadata = { title: "Strategy" };

export default async function StrategyPage() {
  await requireRole(["ADMIN", "SCOUT_LEAD"]);
  const profile = await getTeamProfile();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Our team strategy"
        subtitle="Tell the AI what we do best, where we're weak, and what we want in a partner. The picklist “AI suggest” uses this to recommend robots that cover our gaps."
      />
      <ProfileForm initial={profile} />
    </div>
  );
}
