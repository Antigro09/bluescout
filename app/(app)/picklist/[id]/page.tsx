import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser, canStrategize, isLead } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { colorForId } from "@/lib/realtime/events";
import { PicklistEditor } from "@/components/picklist/picklist-editor";
import { ShareButton } from "@/components/share/share-button";
import { createPicklistShareAction } from "@/lib/share/actions";

export const metadata: Metadata = { title: "Picklist" };

export default async function PicklistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const exists = await prisma.picklist.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) notFound();

  return (
    <div className="space-y-4">
      {isLead(user) && (
        <div className="flex justify-end">
          <ShareButton
            action={createPicklistShareAction.bind(null, id)}
            label="Share read-only"
          />
        </div>
      )}
      <PicklistEditor
        picklistId={id}
        canEdit={canStrategize(user)}
        isLead={isLead(user)}
        user={{ id: user.id, name: user.name, color: colorForId(user.id) }}
      />
    </div>
  );
}
