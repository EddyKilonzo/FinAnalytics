/**
 * Default categories for FinAnalytics — used by Prisma seed and admin "load defaults".
 * Safe to re-run: upserts by slug.
 */
export const DEFAULT_CATEGORIES = [
  {
    name: "Food & Dining",
    slug: "food-dining",
    description: "Restaurants, groceries, coffee, street food",
    color: "#22c55e",
  },
  {
    name: "Groceries",
    slug: "groceries",
    description: "Supermarkets, markets, household food staples",
    color: "#10b981",
  },
  {
    name: "Transport",
    slug: "transport",
    description: "Matatu, Uber, boda-boda, fuel, parking",
    color: "#3b82f6",
  },
  {
    name: "Social",
    slug: "social",
    description: "Going out, events, gifts, entertainment with friends",
    color: "#a855f7",
  },
  {
    name: "Entertainment",
    slug: "entertainment",
    description: "Streaming, cinema, gaming, hobbies",
    color: "#f59e0b",
  },
  {
    name: "Subscriptions",
    slug: "subscriptions",
    description: "Streaming, apps, cloud storage, recurring digital services",
    color: "#d946ef",
  },
  {
    name: "Utilities",
    slug: "utilities",
    description: "Electricity, water, internet, airtime, mobile data",
    color: "#6b7280",
  },
  {
    name: "Health",
    slug: "health",
    description: "Clinic visits, pharmacy, gym, personal care",
    color: "#ef4444",
  },
  {
    name: "Education",
    slug: "education",
    description: "Tuition, HELB repayments, books, courses, stationery",
    color: "#06b6d4",
  },
  {
    name: "Clothing",
    slug: "clothing",
    description: "Clothes, shoes, accessories",
    color: "#ec4899",
  },
  {
    name: "Personal care",
    slug: "personal-care",
    description: "Hair, cosmetics, toiletries, grooming",
    color: "#f472b6",
  },
  {
    name: "Rent & Housing",
    slug: "rent-housing",
    description: "Monthly rent, utilities bundled with housing",
    color: "#84cc16",
  },
  {
    name: "Travel",
    slug: "travel",
    description: "Flights, hotels, trips outside daily commute",
    color: "#0ea5e9",
  },
  {
    name: "Savings",
    slug: "savings",
    description: "Transfers to savings account, chama contributions, M-Shwari",
    color: "#14b8a6",
  },
  {
    name: "Bank & fees",
    slug: "bank-fees",
    description: "M-Pesa charges, ATM fees, bank maintenance",
    color: "#78716c",
  },
  {
    name: "Income",
    slug: "income",
    description: "Salary, freelance, HELB disbursement, parental support",
    color: "#10b981",
  },
  {
    name: "Other",
    slug: "other",
    description: "Anything that does not fit another category",
    color: "#9ca3af",
  },
] as const;
