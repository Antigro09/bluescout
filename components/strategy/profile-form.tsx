"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { saveTeamProfileAction } from "@/lib/strategy/actions";
import type { TeamProfile } from "@/lib/strategy/profile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({ initial }: { initial: TeamProfile }) {
  const [p, setP] = useState<TeamProfile>(initial);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof TeamProfile>(k: K, v: TeamProfile[K]) {
    setP((prev) => ({ ...prev, [k]: v }));
  }

  async function save() {
    setSaving(true);
    const res = await saveTeamProfileAction(p);
    setSaving(false);
    if (res.error) toast.error(res.error);
    else toast.success("Strategy profile saved");
  }

  return (
    <Card>
      <CardContent className="space-y-5 py-5">
        <div className="max-w-32 space-y-1.5">
          <Label htmlFor="teamNumber">Our team #</Label>
          <Input
            id="teamNumber"
            type="number"
            value={p.teamNumber}
            onChange={(e) => set("teamNumber", Number(e.target.value))}
          />
        </div>

        <Field
          label="What we do best"
          placeholder="e.g. fast teleop fuel cycles, reliable L3 climb, strong auto"
          value={p.strengths}
          onChange={(v) => set("strengths", v)}
        />
        <Field
          label="Where we're weak"
          placeholder="e.g. limited auto scoring, no defense, slow intake"
          value={p.weaknesses}
          onChange={(v) => set("weaknesses", v)}
        />
        <Field
          label="What we want in a partner"
          placeholder="e.g. a strong auto + climb partner, or a defender to shut down the top opponent"
          value={p.lookingFor}
          onChange={(v) => set("lookingFor", v)}
        />
        <Field
          label="Other notes (optional)"
          placeholder="Anything else the AI should weigh during selection"
          value={p.notes}
          onChange={(v) => set("notes", v)}
        />

        <Button onClick={save} disabled={saving}>
          <Save className="size-4" />
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
