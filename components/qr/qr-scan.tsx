"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { CheckCircle2, Loader2 } from "lucide-react";
import { decodeFrames, parseFrame } from "@/lib/qr/codec";
import type { IngestResult } from "@/lib/scouting/ingest";

/** Stop the camera only if it is actually running — stop() throws otherwise. */
function safeStop(scanner: Html5Qrcode): void {
  try {
    const state = scanner.getState();
    if (
      state === Html5QrcodeScannerState.SCANNING ||
      state === Html5QrcodeScannerState.PAUSED
    ) {
      scanner.stop().catch(() => {});
    }
  } catch {
    /* scanner was never started */
  }
}

export function QrScan() {
  const [collectedCount, setCollectedCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("Point the camera at the scouter's QR code.");
  const [result, setResult] = useState<IngestResult | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const frames = useRef<Map<number, string>>(new Map());
  const batchId = useRef<string | null>(null);
  const totalRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    let cancelled = false;
    scanner
      .start({ facingMode: "environment" }, { fps: 12, qrbox: 260 }, onScan, () => {})
      .then(() => {
        // Unmounted (e.g. React StrictMode) while the camera was starting.
        if (cancelled) safeStop(scanner);
      })
      .catch((err) => {
        if (!cancelled) setStatus("Camera error: " + String(err));
      });
    return () => {
      cancelled = true;
      safeStop(scanner);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onScan(text: string) {
    if (doneRef.current) return;
    const f = parseFrame(text);
    if (!f) return;
    if (batchId.current && batchId.current !== f.id) return; // ignore other batches
    batchId.current = f.id;
    totalRef.current = f.total;
    if (!frames.current.has(f.index)) {
      frames.current.set(f.index, f.data);
      setCollectedCount(frames.current.size);
      setTotal(f.total);
    }
    if (frames.current.size === f.total) void finish();
  }

  async function finish() {
    doneRef.current = true;
    if (scannerRef.current) safeStop(scannerRef.current);
    try {
      const reports = decodeFrames(frames.current, totalRef.current);
      setStatus("Uploading…");
      const res = await fetch("/api/qr-ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reports }),
      });
      const data = (await res.json()) as IngestResult;
      setResult(data);
      setStatus("Done");
    } catch (e) {
      doneRef.current = false;
      setStatus("Could not read code: " + (e as Error).message);
    }
  }

  function reset() {
    frames.current = new Map();
    batchId.current = null;
    totalRef.current = 0;
    doneRef.current = false;
    setResult(null);
    setCollectedCount(0);
    setTotal(0);
    setStatus("Point the camera at the scouter's QR code.");
    const scanner = scannerRef.current;
    if (!scanner) return;
    safeStop(scanner);
    scanner
      .start({ facingMode: "environment" }, { fps: 12, qrbox: 260 }, onScan, () => {})
      .catch((err) => setStatus("Camera error: " + String(err)));
  }

  return (
    <div className="space-y-4">
      <div
        id="qr-reader"
        className="mx-auto w-full max-w-sm overflow-hidden rounded-lg border border-border"
      />
      {result ? (
        <div className="space-y-3 text-center">
          <div className="flex items-center justify-center gap-2 text-success">
            <CheckCircle2 className="size-5" />
            <span className="font-semibold">
              {result.inserted + result.updated} report
              {result.inserted + result.updated === 1 ? "" : "s"} imported
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {result.inserted} new · {result.updated} updated · {result.skipped}{" "}
            skipped
          </p>
          <button
            onClick={reset}
            className="text-sm text-primary hover:underline"
          >
            Scan another device
          </button>
        </div>
      ) : (
        <div className="text-center text-sm text-muted-foreground">
          {total > 0 ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Collected {collectedCount} of {total} frames…
            </span>
          ) : (
            status
          )}
        </div>
      )}
    </div>
  );
}
