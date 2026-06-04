// Custom Next.js server that also hosts the Socket.IO realtime layer used by
// collaborative picklists. Run with `tsx` (see package.json scripts) — this
// file is NOT processed by the Next.js bundler, so use relative imports and
// runtime-safe syntax only.
import "dotenv/config";
import { createServer } from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import {
  picklistRoom,
  REALTIME_PATH,
  RT,
  type PresenceUser,
} from "./lib/realtime/events";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// room -> (socketId -> user)
const presence = new Map<string, Map<string, PresenceUser>>();

function broadcastPresence(io: SocketIOServer, room: string): void {
  const users = Array.from(presence.get(room)?.values() ?? []);
  io.to(room).emit(RT.presence, users);
}

async function maybeAttachRedis(io: SocketIOServer): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) return;
  const { default: Redis } = await import("ioredis");
  const opts = {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    // Do not auto-reconnect on the initial probe; we fall back gracefully.
    retryStrategy: () => null,
  };
  const pub = new Redis(url, opts);
  const sub = pub.duplicate();
  // Swallow connection errors so a missing Redis does not flood the logs.
  pub.on("error", () => {});
  sub.on("error", () => {});
  try {
    const { createAdapter } = await import("@socket.io/redis-adapter");
    await pub.connect();
    await sub.connect();
    io.adapter(createAdapter(pub, sub));
    console.log("> Realtime: Redis adapter attached");
  } catch (err) {
    console.warn(
      "> Realtime: Redis unavailable, using single-instance adapter —",
      (err as Error).message,
    );
    pub.disconnect();
    sub.disconnect();
  }
}

function setupHandlers(io: SocketIOServer): void {
  io.on("connection", (socket) => {
    let joinedRoom: string | null = null;

    socket.on(
      RT.joinPicklist,
      ({ picklistId, user }: { picklistId: string; user: PresenceUser }) => {
        joinedRoom = picklistRoom(picklistId);
        socket.join(joinedRoom);
        if (!presence.has(joinedRoom)) presence.set(joinedRoom, new Map());
        presence.get(joinedRoom)!.set(socket.id, user);
        broadcastPresence(io, joinedRoom);
      },
    );

    socket.on(RT.reorderPreview, (payload: unknown) => {
      if (joinedRoom) socket.to(joinedRoom).emit(RT.preview, payload);
    });

    socket.on(RT.leavePicklist, () => {
      if (joinedRoom) {
        socket.leave(joinedRoom);
        presence.get(joinedRoom)?.delete(socket.id);
        broadcastPresence(io, joinedRoom);
        joinedRoom = null;
      }
    });

    socket.on("disconnect", () => {
      if (joinedRoom) {
        presence.get(joinedRoom)?.delete(socket.id);
        broadcastPresence(io, joinedRoom);
      }
    });
  });
}

async function main(): Promise<void> {
  await app.prepare();

  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(httpServer, {
    path: REALTIME_PATH,
    cors: { origin: true, credentials: true },
  });

  await maybeAttachRedis(io);
  setupHandlers(io);

  // Expose to the Next.js app (same process) for server-side broadcasts.
  (globalThis as { __bluescoutIo?: SocketIOServer }).__bluescoutIo = io;

  httpServer.listen(port, hostname, () => {
    console.log(
      `> BlueScout ready on http://${hostname}:${port} (${dev ? "dev" : "production"})`,
    );
  });
}

main().catch((err) => {
  console.error("Fatal server error:", err);
  process.exit(1);
});
