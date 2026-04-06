import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type CategoryChoice = { slug: string; name: string };

/** Same shape as {@link MlService.categorise} result for unified handling. */
export type AiCategoryPrediction = {
  suggestedCategorySlug: string;
  confidence: number;
};

/**
 * Shared Anthropic calls: transaction categorisation and analytics “smart” tips.
 * Degrades to null/[] when ANTHROPIC_API_KEY is missing or the API errors.
 */
@Injectable()
export class AnthropicAiService {
  private readonly logger = new Logger(AnthropicAiService.name);

  constructor(private readonly config: ConfigService) {}

  private get apiKey(): string | undefined {
    return this.config.get<string>("ANTHROPIC_API_KEY")?.trim();
  }

  /** Fast/cheap model for classification and short insight JSON (override via env). */
  private get fastModel(): string {
    return (
      this.config.get<string>("ANTHROPIC_FAST_MODEL")?.trim() ||
      "claude-haiku-4-5-20251001"
    );
  }

  /**
   * Pick a category slug from the DB-backed list for this transaction.
   */
  async suggestTransactionCategory(
    description: string,
    type: string,
    categories: CategoryChoice[],
  ): Promise<AiCategoryPrediction | null> {
    if (!this.apiKey || !description?.trim() || categories.length === 0) {
      return null;
    }

    const slugLines = categories
      .map((c) => `- "${c.slug}" — ${c.name}`)
      .join("\n");

    const prompt = `You classify personal finance transactions for FinAnalytics (Kenya, amounts in KES).

Transaction type: ${type}
Description: "${description.trim().replace(/"/g, '\\"')}"

Choose exactly ONE slug from this list that best fits the description:
${slugLines}

Reply with ONLY compact JSON, no markdown fences:
{"slug":"<slug-from-list>","confidence":<number 0 to 1>}

If nothing fits well, still pick the closest slug (never invent new slugs).`;

    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey: this.apiKey });
      const response = await client.messages.create({
        model: this.fastModel,
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }],
      });
      const content = response.content[0];
      if (content.type !== "text") return null;
      const parsed = this.parseJsonObject(content.text);
      if (!parsed?.slug) return null;
      const slug = String(parsed.slug).trim().toLowerCase();
      const allowed = new Set(categories.map((c) => c.slug.toLowerCase()));
      if (!allowed.has(slug)) {
        this.logger.warn(`AI categorisation returned unknown slug "${slug}"`);
        return null;
      }
      const canonical = categories.find(
        (c) => c.slug.toLowerCase() === slug,
      )!.slug;
      if (canonical.toLowerCase() === "other") {
        return null;
      }
      const confidence = Math.min(
        1,
        Math.max(0, Number(parsed.confidence) || 0.85),
      );
      return { suggestedCategorySlug: canonical, confidence };
    } catch (e) {
      this.logger.warn(
        `AI categorisation failed: ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }
  }

  private parseJsonObject(
    text: string,
  ): { slug?: string; confidence?: number } | null {
    const cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as {
        slug?: string;
        confidence?: number;
      };
    } catch {
      return null;
    }
  }

  /**
   * Adds 1–3 LLM tips on top of rule-based insights. Never throws.
   */
  async generateSmartInsights(
    existingInsights: { message: string }[],
    dataSummary: string,
  ): Promise<Array<{ message: string; severity: "info" | "tip" | "warning" }>> {
    if (!this.apiKey || !dataSummary?.trim()) return [];

    const prior =
      existingInsights.length > 0
        ? existingInsights.map((i) => `- ${i.message}`).join("\n")
        : "(none yet)";

    const prompt = `You are a concise financial coach for young adults in Kenya using FinAnalytics (transactions and budgets in KES).

Summary:
${dataSummary}

Existing automated insights (do not repeat them verbatim):
${prior}

Respond with 1 to 3 NEW short actionable tips (max 2 sentences each). Reference Kenyan context when helpful (M-Pesa, HELB, etc.). If data is very sparse, give one gentle encouragement to keep logging.

Reply with ONLY a valid JSON array:
[{"message":"...","severity":"info"|"tip"|"warning"}]`;

    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey: this.apiKey });
      const response = await client.messages.create({
        model: this.fastModel,
        max_tokens: 550,
        messages: [{ role: "user", content: prompt }],
      });
      const content = response.content[0];
      if (content.type !== "text") return [];
      const cleaned = content.text
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (!match) return [];
      const arr = JSON.parse(match[0]) as Array<{
        message?: string;
        severity?: string;
      }>;
      if (!Array.isArray(arr)) return [];
      const out: Array<{
        message: string;
        severity: "info" | "tip" | "warning";
      }> = [];
      for (const item of arr.slice(0, 3)) {
        if (!item?.message?.trim()) continue;
        const sev = item.severity;
        const severity =
          sev === "warning" || sev === "tip" || sev === "info"
            ? sev
            : ("tip" as const);
        out.push({
          message: item.message.trim().slice(0, 520),
          severity,
        });
      }
      return out;
    } catch (e) {
      this.logger.warn(
        `AI smart insights failed: ${e instanceof Error ? e.message : String(e)}`,
      );
      return [];
    }
  }
}
