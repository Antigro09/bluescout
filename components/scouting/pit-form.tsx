"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { PIT_SCOUT_SECTIONS } from "@/config/rebuilt-2026";
import { FieldInput, type FieldValue } from "@/components/scouting/field-input";
import { savePitReportAction, type PitInput } from "@/lib/scouting/pit-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PitForm({
  teamNumber,
  initial,
}: {
  teamNumber: number;
  initial: Record<string, FieldValue>;
}) {
  const [values, setValues] = useState<Record<string, FieldValue>>(initial);
  const [saving, setSaving] = useState(false);

  function setValue(k: string, v: FieldValue) {
    setValues((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setSaving(true);
    const num = (v: FieldValue) =>
      typeof v === "number" ? v : v == null || v === "" ? null : Number(v);
    const input: PitInput = {
      teamNumber,
      drivetrain: values.drivetrain
        ? (String(values.drivetrain) as PitInput["drivetrain"])
        : null,
      weightLbs: num(values.weightLbs),
      widthIn: num(values.widthIn),
      lengthIn: num(values.lengthIn),
      heightIn: num(values.heightIn),
      motorCount: num(values.motorCount),
      scoringMechanism:
        typeof values.scoringMechanism === "string" ? values.scoringMechanism : null,
      maxFuelCapacity: num(values.maxFuelCapacity),
      climbLevels: (Array.isArray(values.climbLevels)
        ? values.climbLevels
        : []) as PitInput["climbLevels"],
      autoMaxFuel: num(values.autoMaxFuel),
      autoDescription:
        typeof values.autoDescription === "string" ? values.autoDescription : null,
      language: typeof values.language === "string" ? values.language : null,
      hasVision: values.hasVision === true,
      notes: typeof values.notes === "string" ? values.notes : null,
    };
    const res = await savePitReportAction(input);
    setSaving(false);
    if (res.error) toast.error(res.error);
    else toast.success("Pit report saved");
  }

  return (
    <div className="space-y-4">
      {PIT_SCOUT_SECTIONS.map((section) => (
        <Card key={section.id}>
          <CardContent className="space-y-5 py-5">
            <h2 className="font-semibold">{section.title}</h2>
            {section.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <label className="block text-sm font-medium">{field.label}</label>
                <FieldInput
                  field={field}
                  value={values[field.key] ?? null}
                  onChange={(v) => setValue(field.key, v)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      <Button onClick={save} disabled={saving}>
        <Save className="size-4" />
        {saving ? "Saving…" : "Save pit report"}
      </Button>
    </div>
  );
}
