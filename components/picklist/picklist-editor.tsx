"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  X,
  Ban,
  Lock,
  Unlock,
  Plus,
  Undo2,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { suggestPicklistAction } from "@/lib/ai/actions";
import { usePicklistSocket } from "./use-picklist-socket";
import type { PresenceUser } from "@/lib/realtime/events";
import {
  addEntryAction,
  removeEntryAction,
  reorderEntriesAction,
  togglePickedAction,
  toggleDoNotPickAction,
  addCommentAction,
  setLockedAction,
} from "@/lib/picklist/actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Entry {
  id: string;
  teamNumber: number;
  nickname: string | null;
  picked: boolean;
  composite: number | null;
}
interface DNP {
  teamNumber: number;
  nickname: string | null;
}
interface Comment {
  id: string;
  content: string;
  author: string | null;
  createdAt: string;
}
interface Data {
  id: string;
  name: string;
  locked: boolean;
  entries: Entry[];
  doNotPick: DNP[];
  comments: Comment[];
  available: { teamNumber: number; nickname: string | null }[];
}

export function PicklistEditor({
  picklistId,
  canEdit,
  isLead,
  user,
}: {
  picklistId: string;
  canEdit: boolean;
  isLead: boolean;
  user: PresenceUser;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [comment, setComment] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  async function suggest() {
    setSuggesting(true);
    const res = await suggestPicklistAction();
    setSuggesting(false);
    if (res.error) toast.error(res.error);
    else if (res.text) setSuggestion(res.text);
  }

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/picklist/${picklistId}`);
    if (res.ok) setData(await res.json());
  }, [picklistId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const { presence } = usePicklistSocket(picklistId, user, fetchData);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  if (!data) {
    return (
      <div className="py-20 text-center text-muted-foreground">Loading…</div>
    );
  }
  const editable = canEdit && !data.locked;

  async function onDragEnd(e: DragEndEvent) {
    if (!data || !editable) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = data.entries.findIndex((x) => x.id === active.id);
    const newIndex = data.entries.findIndex((x) => x.id === over.id);
    const next = arrayMove(data.entries, oldIndex, newIndex);
    setData({ ...data, entries: next });
    await reorderEntriesAction(
      picklistId,
      next.map((x) => x.id),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
          {data.locked && <Badge variant="warning">Locked</Badge>}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {presence.map((p) => (
              <span
                key={p.id + p.name}
                title={p.name}
                className="flex size-7 items-center justify-center rounded-full border-2 border-background text-[10px] font-bold text-white"
                style={{ background: p.color }}
              >
                {p.name.slice(0, 2).toUpperCase()}
              </span>
            ))}
          </div>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={suggest}
              disabled={suggesting}
            >
              {suggesting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              AI suggest
            </Button>
          )}
          {isLead && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await setLockedAction(picklistId, !data.locked);
              }}
            >
              {data.locked ? (
                <Unlock className="size-4" />
              ) : (
                <Lock className="size-4" />
              )}
              {data.locked ? "Unlock" : "Lock"}
            </Button>
          )}
        </div>
      </div>

      {suggestion && (
        <Card className="border-primary/30">
          <CardContent className="py-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
                <Sparkles className="size-4" /> AI suggestion
              </span>
              <button
                onClick={() => setSuggestion(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="whitespace-pre-wrap text-sm">{suggestion}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={data.entries.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1.5">
                {data.entries.map((entry, i) => (
                  <SortableEntry
                    key={entry.id}
                    entry={entry}
                    rank={i + 1}
                    editable={editable}
                    onTogglePicked={async () => {
                      await togglePickedAction(entry.id);
                    }}
                    onRemove={async () => {
                      await removeEntryAction(entry.id);
                    }}
                    onDnp={async () => {
                      await toggleDoNotPickAction(picklistId, entry.teamNumber);
                    }}
                  />
                ))}
                {data.entries.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No teams yet — add some from the panel.
                  </p>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="space-y-4">
          {editable && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add team</CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  value=""
                  onChange={async (e) => {
                    const n = Number(e.target.value);
                    if (n) await addEntryAction(picklistId, n);
                  }}
                  className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">Select a team…</option>
                  {data.available.map((t) => (
                    <option key={t.teamNumber} value={t.teamNumber}>
                      {t.teamNumber}
                      {t.nickname ? ` · ${t.nickname}` : ""}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Do not pick ({data.doNotPick.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {data.doNotPick.length === 0 && (
                <p className="text-sm text-muted-foreground">None.</p>
              )}
              {data.doNotPick.map((d) => (
                <div
                  key={d.teamNumber}
                  className="flex items-center justify-between rounded-md bg-destructive/10 px-2 py-1.5 text-sm"
                >
                  <span className="text-destructive">
                    {d.teamNumber} {d.nickname ? `· ${d.nickname}` : ""}
                  </span>
                  {editable && (
                    <button
                      onClick={async () =>
                        toggleDoNotPickAction(picklistId, d.teamNumber)
                      }
                      title="Restore"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Undo2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Discussion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Comment…"
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && comment.trim()) {
                      await addCommentAction(picklistId, comment);
                      setComment("");
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!comment.trim()) return;
                    await addCommentAction(picklistId, comment);
                    setComment("");
                  }}
                >
                  Post
                </Button>
              </div>
              <div className="space-y-2">
                {data.comments.map((c) => (
                  <div key={c.id} className="text-sm">
                    <span className="font-medium">{c.author ?? "Someone"}</span>{" "}
                    <span className="text-muted-foreground">{c.content}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SortableEntry({
  entry,
  rank,
  editable,
  onTogglePicked,
  onRemove,
  onDnp,
}: {
  entry: Entry;
  rank: number;
  editable: boolean;
  onTogglePicked: () => void;
  onRemove: () => void;
  onDnp: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry.id, disabled: !editable });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-2",
        isDragging && "opacity-60 shadow-lg",
        entry.picked && "opacity-50",
      )}
    >
      {editable && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground"
          aria-label="drag"
        >
          <GripVertical className="size-4" />
        </button>
      )}
      <span className="w-6 text-center text-sm font-bold text-muted-foreground tabular-nums">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "font-semibold",
            entry.picked && "line-through",
          )}
        >
          {entry.teamNumber}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {entry.nickname ?? "—"}
        </div>
      </div>
      {entry.composite != null && (
        <Badge variant="muted" className="tabular-nums">
          {entry.composite}
        </Badge>
      )}
      {editable && (
        <div className="flex items-center gap-0.5">
          <button
            onClick={onTogglePicked}
            title={entry.picked ? "Mark available" : "Mark picked/taken"}
            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Plus
              className={cn("size-4", entry.picked && "rotate-45")}
            />
          </button>
          <button
            onClick={onDnp}
            title="Do not pick"
            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Ban className="size-4" />
          </button>
          <button
            onClick={onRemove}
            title="Remove"
            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
