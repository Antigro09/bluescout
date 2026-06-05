"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";
import { addPhotoAction, deletePhotoAction } from "@/lib/scouting/pit-actions";
import { Button } from "@/components/ui/button";

interface Photo {
  id: string;
  url: string;
  caption: string | null;
}

function resize(file: File, max: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error("no canvas context"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load error"));
    };
    img.src = url;
  });
}

export function PhotoUploader({
  teamNumber,
  photos,
}: {
  teamNumber: number;
  photos: Photo[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await resize(file, 900, 0.7);
      const res = await addPhotoAction(teamNumber, dataUrl);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Photo added");
        router.refresh();
      }
    } catch {
      toast.error("Could not process image");
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function remove(id: string) {
    await deletePhotoAction(id);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />
      <Button
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        <Camera className="size-4" />
        {busy ? "Adding…" : "Add photo"}
      </Button>
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((p) => (
            <div key={p.id} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.caption ?? "robot"}
                className="aspect-square w-full rounded-lg object-cover"
              />
              <button
                onClick={() => remove(p.id)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="delete photo"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
