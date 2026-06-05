"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListPlus, Sparkles } from "lucide-react";
import {
  createPicklistAction,
  seedFromRankingsAction,
} from "@/lib/picklist/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreatePicklistForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const res = await createPicklistAction(name || "Picklist", "OVERALL");
    setBusy(false);
    if (res.error) toast.error(res.error);
    else if (res.id) router.push(`/picklist/${res.id}`);
  }

  async function seed() {
    setBusy(true);
    const res = await seedFromRankingsAction(name || "Overall picklist");
    setBusy(false);
    if (res.error) toast.error(res.error);
    else if (res.id) router.push(`/picklist/${res.id}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Picklist name"
        className="max-w-xs"
      />
      <Button onClick={create} disabled={busy} variant="outline">
        <ListPlus className="size-4" />
        Create empty
      </Button>
      <Button onClick={seed} disabled={busy}>
        <Sparkles className="size-4" />
        Seed from rankings
      </Button>
    </div>
  );
}
