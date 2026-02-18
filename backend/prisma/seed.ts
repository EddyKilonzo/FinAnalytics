/**
 * Seed script — populates default categories so users have something to
 * pick from immediately after the database is created.
 *
 * Run with:   npm run db:seed
 *   or:       npx prisma db seed
 *
 * Safe to re-run: upsert logic means existing slugs are updated, not duplicated.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default categories that cover everyday spending for young Kenyans.
// Colors follow a consistent palette so the frontend can use them
// directly in charts and category badges.
const DEFAULT_CATEGORIES = [
  {
    name: 'Food & Dining',
    slug: 'food-dining',
    description: 'Restaurants, groceries, coffee, street food',
    color: '#22c55e', // green
  },
  {
    name: 'Transport',
    slug: 'transport',
    description: 'Matatu, Uber, boda-boda, fuel, parking',
    color: '#3b82f6', // blue
  },
  {
    name: 'Social',
    slug: 'social',
    description: 'Going out, events, gifts, entertainment with friends',
    color: '#a855f7', // purple — highlighted per product spec
  },
  {
    name: 'Entertainment',
    slug: 'entertainment',
    description: 'Streaming, cinema, gaming, hobbies',
    color: '#f59e0b', // amber
  },
  {
    name: 'Utilities',
    slug: 'utilities',
    description: 'Electricity, water, internet, airtime, mobile data',
    color: '#6b7280', // gray
  },
  {
    name: 'Health',
    slug: 'health',
    description: 'Clinic visits, pharmacy, gym, personal care',
    color: '#ef4444', // red
  },
  {
    name: 'Education',
    slug: 'education',
    description: 'Tuition, HELB repayments, books, courses, stationery',
    color: '#06b6d4', // cyan
  },
  {
    name: 'Clothing',
    slug: 'clothing',
    description: 'Clothes, shoes, accessories',
    color: '#ec4899', // pink
  },
  {
    name: 'Rent & Housing',
    slug: 'rent-housing',
    description: 'Monthly rent, utilities bundled with housing',
    color: '#84cc16', // lime
  },
  {
    name: 'Savings',
    slug: 'savings',
    description: 'Transfers to savings account, chama contributions, M-Shwari',
    color: '#14b8a6', // teal
  },
  {
    name: 'Income',
    slug: 'income',
    description: 'Salary, freelance, HELB disbursement, parental support',
    color: '#10b981', // emerald
  },
  {
    name: 'Other',
    slug: 'other',
    description: 'Anything that does not fit another category',
    color: '#9ca3af', // gray-400
  },
];

async function main() {
  console.log('Seeding default categories…');

  for (const cat of DEFAULT_CATEGORIES) {
    const result = await prisma.category.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: { name: cat.name, description: cat.description, color: cat.color },
    });
    console.log(`  ✓  ${result.name} (${result.slug})`);
  }

  console.log(`\nDone — ${DEFAULT_CATEGORIES.length} categories seeded.`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
