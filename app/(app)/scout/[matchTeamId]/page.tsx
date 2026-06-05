"use client";

import { useParams } from "next/navigation";
import { ScoutForm } from "@/components/scouting/scout-form";

export default function ScoutPage() {
  const params = useParams<{ matchTeamId: string }>();
  const id = typeof params.matchTeamId === "string" ? params.matchTeamId : "";
  return <ScoutForm matchTeamId={id} />;
}
