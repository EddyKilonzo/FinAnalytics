/**
 * Seed script — populates default categories so users have something to
 * pick from immediately after the database is created.
 *
 * Run with:   npm run db:seed
 *   or:       npx prisma db seed
 *
 * Safe to re-run: upsert logic means existing slugs are updated, not duplicated.
 */

import { PrismaClient } from "@prisma/client";
import { DEFAULT_CATEGORIES } from "../src/categories/default-categories.data";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding default categories…");

  for (const cat of DEFAULT_CATEGORIES) {
    const result = await prisma.category.upsert({
      where: { slug: cat.slug },
      create: { ...cat },
      update: {
        name: cat.name,
        description: cat.description,
        color: cat.color,
      },
    });
    console.log(`  ✓  ${result.name} (${result.slug})`);
  }

  console.log(`\nDone — ${DEFAULT_CATEGORIES.length} categories seeded.`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
