import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Intentionally minimal — production seed is a no-op.
  // Add development fixtures behind a flag if needed.
  if (process.env.SEED_DEV === "1") {
    console.warn("Dev seed skipped (no fixtures defined yet).");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
