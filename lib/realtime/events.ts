// Shared realtime contract used by both the Socket.IO server (server.ts) and
// the browser client. Keep this file dependency-free so it is safe to import
// from the tsx-run custom server and from bundled app code alike.

export const REALTIME_PATH = "/realtime";

export function picklistRoom(picklistId: string): string {
  return `picklist:${picklistId}`;
}

export const RT = {
  // client -> server
  joinPicklist: "picklist:join",
  leavePicklist: "picklist:leave",
  reorderPreview: "picklist:reorder-preview",
  // server -> client
  presence: "picklist:presence",
  changed: "picklist:changed",
  preview: "picklist:preview",
} as const;

export interface PresenceUser {
  id: string;
  name: string;
  color: string;
}
