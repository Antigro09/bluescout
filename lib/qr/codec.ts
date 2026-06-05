import { gzip, ungzip } from "pako";
import type { ReportInput } from "@/lib/scouting/schema";

// Wire format for one QR frame:  BSQR|<batchId>|<index>|<total>|<base64chunk>
const PREFIX = "BSQR";
const MAX_CHUNK = 1100; // base64 chars per frame — comfortably scannable on a phone

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Compress + chunk a batch of reports into QR frame strings. */
export function encodeReports(reports: ReportInput[]): string[] {
  const json = JSON.stringify(reports);
  const b64 = toBase64(gzip(json));
  const id = Math.random().toString(36).slice(2, 8);
  const total = Math.max(1, Math.ceil(b64.length / MAX_CHUNK));
  const frames: string[] = [];
  for (let i = 0; i < total; i++) {
    const chunk = b64.slice(i * MAX_CHUNK, (i + 1) * MAX_CHUNK);
    frames.push(`${PREFIX}|${id}|${i}|${total}|${chunk}`);
  }
  return frames;
}

export interface FrameInfo {
  id: string;
  index: number;
  total: number;
  data: string;
}

export function parseFrame(raw: string): FrameInfo | null {
  if (!raw.startsWith(PREFIX + "|")) return null;
  const parts = raw.split("|");
  if (parts.length < 5) return null;
  const [, id, idx, total, ...rest] = parts;
  const index = Number(idx);
  const totalN = Number(total);
  if (!Number.isFinite(index) || !Number.isFinite(totalN)) return null;
  return { id, index, total: totalN, data: rest.join("|") };
}

/** Reassemble collected frames back into reports. Throws if any are missing. */
export function decodeFrames(
  frames: Map<number, string>,
  total: number,
): ReportInput[] {
  let b64 = "";
  for (let i = 0; i < total; i++) {
    const chunk = frames.get(i);
    if (chunk === undefined) throw new Error(`missing frame ${i + 1}/${total}`);
    b64 += chunk;
  }
  const json = ungzip(fromBase64(b64), { to: "string" });
  return JSON.parse(json) as ReportInput[];
}
