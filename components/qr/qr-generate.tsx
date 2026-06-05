"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { encodeReports } from "@/lib/qr/codec";
import type { ReportInput } from "@/lib/scouting/schema";
import { Button } from "@/components/ui/button";

export function QrGenerate({ reports }: { reports: ReportInput[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (reports.length === 0) {
      setUrls([]);
      return;
    }
    const frames = encodeReports(reports);
    Promise.all(
      frames.map((s) =>
        QRCode.toDataURL(s, {
          errorCorrectionLevel: "L",
          margin: 1,
          width: 340,
        }),
      ),
    ).then(setUrls);
    setIdx(0);
  }, [reports]);

  useEffect(() => {
    if (!playing || urls.length <= 1) return;
    const iv = setInterval(() => setIdx((i) => (i + 1) % urls.length), 500);
    return () => clearInterval(iv);
  }, [playing, urls.length]);

  if (reports.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No unsynced reports on this device.
      </p>
    );
  }
  if (urls.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">Generating…</p>;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={urls[idx]}
        alt={`QR frame ${idx + 1}`}
        width={340}
        height={340}
        className="rounded-lg bg-white p-2"
      />
      <div className="text-sm text-muted-foreground">
        {urls.length > 1
          ? `Frame ${idx + 1} of ${urls.length} · `
          : ""}
        {reports.length} report{reports.length === 1 ? "" : "s"}
      </div>
      {urls.length > 1 && (
        <p className="max-w-xs text-center text-xs text-muted-foreground">
          Keep this on screen — the lead scanner reads all frames as they cycle.
        </p>
      )}
      {urls.length > 1 && (
        <Button variant="outline" size="sm" onClick={() => setPlaying((p) => !p)}>
          {playing ? "Pause" : "Play"}
        </Button>
      )}
    </div>
  );
}
