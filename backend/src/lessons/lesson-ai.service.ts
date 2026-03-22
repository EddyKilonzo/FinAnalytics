import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Cron } from "@nestjs/schedule";

export interface LessonDraft {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  body: string;
  durationMinutes: number;
  topics: string[];
  status: "pending" | "approved" | "rejected";
  generatedAt: string;
  reviewedAt?: string;
}

const DRAFTS_PATH = join(process.cwd(), "data", "lesson-drafts.json");

const LESSON_TOPICS = [
  { title: "Understanding Credit Scores in Kenya", category: "Personal Finance", topics: ["credit", "banking", "CRB"] },
  { title: "How to Invest in NSE Stocks", category: "Investing", topics: ["stocks", "NSE", "investing"] },
  { title: "Zero-Based Budgeting Explained", category: "Budgeting", topics: ["budgeting", "planning", "expenses"] },
  { title: "Building a 6-Month Emergency Fund", category: "Savings", topics: ["savings", "emergency fund", "financial safety"] },
  { title: "Understanding MPesa's Lock Savings (M-Shwari)", category: "Savings", topics: ["M-Shwari", "savings", "mobile banking"] },
  { title: "How SACCOs Work and Why to Join One", category: "Savings", topics: ["SACCO", "cooperative", "savings"] },
  { title: "Tax Basics for Kenyan Employees (PAYE)", category: "Personal Finance", topics: ["tax", "PAYE", "KRA"] },
];

@Injectable()
export class LessonAiService {
  private readonly logger = new Logger(LessonAiService.name);

  constructor(private readonly config: ConfigService) {}

  private loadDrafts(): LessonDraft[] {
    try {
      return JSON.parse(readFileSync(DRAFTS_PATH, "utf-8")) as LessonDraft[];
    } catch {
      return [];
    }
  }

  private saveDrafts(drafts: LessonDraft[]): void {
    writeFileSync(DRAFTS_PATH, JSON.stringify(drafts, null, 2), "utf-8");
  }

  getAllDrafts(): LessonDraft[] {
    return this.loadDrafts();
  }

  getPendingDrafts(): LessonDraft[] {
    return this.loadDrafts().filter((d) => d.status === "pending");
  }

  approveDraft(id: string): LessonDraft | null {
    const drafts = this.loadDrafts();
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return null;
    draft.status = "approved";
    draft.reviewedAt = new Date().toISOString();
    this.saveDrafts(drafts);
    return draft;
  }

  rejectDraft(id: string): boolean {
    const drafts = this.loadDrafts();
    const idx = drafts.findIndex((d) => d.id === id);
    if (idx === -1) return false;
    drafts[idx].status = "rejected";
    drafts[idx].reviewedAt = new Date().toISOString();
    this.saveDrafts(drafts);
    return true;
  }

  deleteDraft(id: string): boolean {
    const drafts = this.loadDrafts();
    const idx = drafts.findIndex((d) => d.id === id);
    if (idx === -1) return false;
    drafts.splice(idx, 1);
    this.saveDrafts(drafts);
    return true;
  }

  /**
   * Scheduled task: runs every Monday at 08:00 to generate AI lesson drafts.
   * Requires ANTHROPIC_API_KEY environment variable.
   */
  @Cron("0 8 * * 1")
  async generateWeeklyDrafts(): Promise<void> {
    const apiKey = this.config.get<string>("ANTHROPIC_API_KEY");
    if (!apiKey) {
      this.logger.warn("ANTHROPIC_API_KEY not set — skipping weekly lesson generation");
      return;
    }

    this.logger.log("Starting weekly AI lesson draft generation...");
    const drafts = this.loadDrafts();

    // Pick a topic that hasn't been drafted recently (not in pending/approved)
    const recentTitles = new Set(drafts.filter((d) => d.status !== "rejected").map((d) => d.title));
    const available = LESSON_TOPICS.filter((t) => !recentTitles.has(t.title));
    if (available.length === 0) {
      this.logger.log("All lesson topics already drafted.");
      return;
    }

    const topic = available[Math.floor(Math.random() * available.length)];

    try {
      // Dynamic import to avoid hard crash if SDK not installed
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey });

      const prompt = `You are a financial education writer for FinAnalytics, a personal finance app for Kenyan university students and young professionals.

Write a comprehensive lesson on: "${topic.title}"
Category: ${topic.category}

Format the lesson as Markdown with these sections:
1. A compelling H1 title
2. An intro paragraph (what the lesson covers and why it matters)
3. 3-5 H2 sections with detailed content, practical examples in Kenyan context (KES amounts, M-Pesa, NSE, SACCOs, etc.)
4. A clear "Key Takeaways" H2 section with a bullet list
5. A "Next Steps" H2 with 2-3 actionable items

The lesson should be 600-900 words, educational, conversational, and actionable. Use KES amounts for examples.`;

      const response = await client.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== "text") throw new Error("Unexpected response type");
      const body = content.text;

      // Estimate read time (avg 200 words/min)
      const wordCount = body.split(/\s+/).length;
      const durationMinutes = Math.max(3, Math.round(wordCount / 200));

      // Generate a simple summary from the first paragraph
      const firstPara = body.split("\n\n").find((p) => p && !p.startsWith("#")) ?? "";
      const summary = firstPara.replace(/[#*]/g, "").trim().slice(0, 200);

      const id = `draft-${Date.now()}`;
      const slug = topic.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      const draft: LessonDraft = {
        id,
        title: topic.title,
        slug,
        category: topic.category,
        summary,
        body,
        durationMinutes,
        topics: topic.topics,
        status: "pending",
        generatedAt: new Date().toISOString(),
      };

      drafts.push(draft);
      this.saveDrafts(drafts);
      this.logger.log(`AI lesson draft generated: "${topic.title}" (id: ${id})`);
    } catch (err) {
      this.logger.error(
        `Failed to generate lesson draft: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Trigger draft generation on-demand (admin use). */
  async generateDraftNow(topicOverride?: string): Promise<LessonDraft | null> {
    const apiKey = this.config.get<string>("ANTHROPIC_API_KEY");
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured on the server.");
    }

    const topic = topicOverride
      ? { title: topicOverride, category: "Personal Finance", topics: ["finance"] }
      : LESSON_TOPICS[Math.floor(Math.random() * LESSON_TOPICS.length)];

    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey });

      const prompt = `You are a financial education writer for FinAnalytics, a personal finance app for Kenyan university students and young professionals.

Write a comprehensive lesson on: "${topic.title}"
Category: ${topic.category}

Format the lesson as Markdown with these sections:
1. A compelling H1 title
2. An intro paragraph
3. 3-5 H2 sections with detailed content and Kenyan examples (KES, M-Pesa, NSE, SACCOs)
4. A "Key Takeaways" H2 with bullet points
5. A "Next Steps" H2 with 2-3 actionable items

600-900 words. Conversational, practical, and actionable.`;

      const response = await client.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== "text") throw new Error("Unexpected response type");
      const body = content.text;
      const wordCount = body.split(/\s+/).length;
      const durationMinutes = Math.max(3, Math.round(wordCount / 200));
      const firstPara = body.split("\n\n").find((p) => p && !p.startsWith("#")) ?? "";
      const summary = firstPara.replace(/[#*]/g, "").trim().slice(0, 200);

      const id = `draft-${Date.now()}`;
      const slug = topic.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      const draft: LessonDraft = {
        id, title: topic.title, slug,
        category: topic.category, summary, body, durationMinutes,
        topics: topic.topics, status: "pending",
        generatedAt: new Date().toISOString(),
      };

      const drafts = this.loadDrafts();
      drafts.push(draft);
      this.saveDrafts(drafts);
      return draft;
    } catch (err) {
      this.logger.error(`generateDraftNow failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }
}
