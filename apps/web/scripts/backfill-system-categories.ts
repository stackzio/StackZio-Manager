import { prisma } from "@stackzio/db";
import { SYSTEM_CATEGORIES, seedSystemExpenseCategories } from "../src/server/finance/categories-seed";

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true } });
  for (const o of orgs) {
    await seedSystemExpenseCategories(prisma, o.id);
    console.log("seeded", o.id);
  }
  console.log(`Done. Seeded ${orgs.length} org(s) with ${SYSTEM_CATEGORIES.length} system categories.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .then(() => process.exit(0));
