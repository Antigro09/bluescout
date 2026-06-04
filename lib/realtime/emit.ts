import type { Server as SocketIOServer } from "socket.io";
import { picklistRoom, RT } from "@/lib/realtime/events";

// The custom server (server.ts) stores the Socket.IO instance on globalThis so
// that server actions / route handlers running in the same Node process can
// broadcast changes. With the Redis adapter attached this fans out across all
// app instances.
export function getIo(): SocketIOServer | null {
  return (globalThis as { __bluescoutIo?: SocketIOServer }).__bluescoutIo ?? null;
}

export function emitToRoom(room: string, event: string, payload: unknown): void {
  getIo()?.to(room).emit(event, payload);
}

/** Notify everyone viewing a picklist that its persisted state changed. */
export function notifyPicklistChanged(picklistId: string): void {
  emitToRoom(picklistRoom(picklistId), RT.changed, { picklistId, at: Date.now() });
}
