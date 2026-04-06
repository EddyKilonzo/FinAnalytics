// ── Shared API wrapper shapes ──────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginatedMeta;
}

// ── Category ───────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  color?: string | null;
}

// ── Transaction ────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  description?: string | null;
  date: string;
  categoryId?: string | null;
  suggestedCategoryId?: string | null;
  categoryConfidence?: number | null;
  incomeSource?: string | null;
  category?: Category | null;
  suggestedCategory?: Category | null;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  incomeBySource: { source: string; total: number }[];
}

export interface CategoryBreakdown {
  categoryId: string | null;
  name: string;
  color: string | null;
  slug: string | null;
  total: number;
}

export interface TransactionListResult {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Budget ─────────────────────────────────────────────────────────────────

export interface Budget {
  id: string;
  userId: string;
  categoryId?: string | null;
  limitAmount: number;
  period: string;
  startAt: string;
  endAt: string;
  category?: Category | null;
  // enriched fields
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  alertStatus: 'over' | 'near' | 'ok';
  isSocial: boolean;
}

export interface NudgeItem {
  id: string;
  type: string;
  message: string;
  severity: string;
}

export interface BudgetAlertsResponse {
  budgetAlerts: Budget[];
  nudges: NudgeItem[];
}

// ── Goal ───────────────────────────────────────────────────────────────────

export interface Goal {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  targetAmount: number;
  currentAmount: number;
  deadline?: string | null;
  status?: 'completed' | 'on_track' | 'at_risk' | 'overdue' | 'in_progress';
  createdAt?: string;
  updatedAt?: string;
}

// ── Lesson ─────────────────────────────────────────────────────────────────

export interface LessonQuizQuestion {
  question: string;
  options: string[];
  /** 0-based index of the correct option (preferred). */
  correct?: number;
  /** Alias used in `lessons.json`; normalized to `correct` in the lesson view. */
  correctIndex?: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  slug: string;
  durationMinutes: number;
  topics: string[];
  summary: string;
  body?: string;
  quiz?: LessonQuizQuestion[];
  // optional legacy / backend fields
  description?: string;
  category?: string;
  tags?: string[];
  readTimeMinutes?: number;
  published?: boolean;
  content?: string;
}

export interface LessonProgressItem {
  lessonId: string;
  completedAt: string;
}

export interface SuggestedLesson {
  lessonId: string;
  slug: string;
  reason: string;
}

/** GET /lessons/leaderboard — ranked learners */
export interface LessonLeaderboardEntry {
  rank: number;
  name: string;
  lessonsCompleted: number;
  correctAnswers: number;
  score: number;
}

// ── Analytics ──────────────────────────────────────────────────────────────

export interface Insight {
  id: string;
  type: string;
  message: string;
  severity?: 'info' | 'tip' | 'warning';
  /** Backend: rule engine vs Anthropic smart tips */
  source?: 'rules' | 'ai';
}

// ── Admin ──────────────────────────────────────────────────────────────────

export interface AdminDashboardStats {
  totalUsers: number;
  totalTransactions: number;
  totalBudgets: number;
  totalGoals: number;
  recentSignups: number;
}

export interface MonthlyStatItem {
  label: string;
  transactions: number;
  users: number;
}
