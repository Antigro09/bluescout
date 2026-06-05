// Manual / cron event sync:  npx tsx scripts/sync.ts <eventKey> [--active]
import "dotenv/config";
import { syncEvent } from "@/lib/sync/event-sync";
import { prisma } from "@/lib/db";

async function main() {
  const key = process.argv[2];
  const setActive = process.argv.includes("--active");
  if (!key) {
    console.error("Usage: tsx scripts/sync.ts <eventKey> [--active]");
    process.exit(1);
  }
  const result = await syncEvent(key);
  console.log("Synced:", JSON.stringify(result, null, 2));
  if (setActive) {
    await prisma.event.updateMany({
      data: { isActive: false },
      where: { isActive: true },
    });
    await prisma.event.update({ where: { key }, data: { isActive: true } });
    console.log(`Set active event: ${key}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Sync failed:", e);
  process.exit(1);
});
