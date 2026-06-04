import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep server-only DB/driver/queue packages out of the bundle.
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "ioredis", "bullmq"],
  images: {
    // Robot pit photos are stored locally / as same-origin uploads by default.
    remotePatterns: [
      { protocol: "https", hostname: "**.thebluealliance.com" },
    ],
  },
  // Custom server (server.ts) is used for Socket.IO, so we do NOT use
  // standalone output. The Docker image runs `tsx server.ts` directly.
};

export default nextConfig;
