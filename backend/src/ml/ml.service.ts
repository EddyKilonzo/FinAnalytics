import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Result returned by the Python ML service on a successful /predict call.
 * category_slug is one of the slugs seeded in the categories table.
 * confidence is 0–1 (4 decimal places).
 */
export interface MlPrediction {
  suggestedCategorySlug: string;
  confidence: number;
}

/**
 * MlService — thin HTTP client around the Python FastAPI categorisation service.
 *
 * Responsibilities
 * ────────────────
 * • Send a transaction description + type to POST /predict and return the
 *   predicted category slug with confidence.
 * • Push user corrections to POST /feedback so the model can be retrained.
 * • Degrade gracefully: every network / timeout error is caught and logged;
 *   callers receive null instead of an exception so transaction creation is
 *   never blocked by an unavailable ML service.
 *
 * Configuration
 * ─────────────
 * ML_SERVICE_URL   Base URL of the Python service (default: http://localhost:8000)
 * ML_TIMEOUT_MS    Per-request timeout in milliseconds (default: 3000)
 */
@Injectable()
export class MlService {
  private readonly logger = new Logger(MlService.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (config.get<string>('ML_SERVICE_URL') ?? 'http://localhost:8000').replace(
      /\/$/,
      '',
    );
    this.timeoutMs = parseInt(config.get<string>('ML_TIMEOUT_MS') ?? '3000', 10);
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Ask the ML service to classify a transaction description.
   *
   * Returns a prediction object on success, or null if the ML service is
   * unavailable or the request times out — allowing the caller to proceed
   * without a suggestion rather than failing entirely.
   */
  async categorise(description: string, type: string): Promise<MlPrediction | null> {
    if (!description?.trim()) return null;

    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim(), type }),
      });

      if (!response.ok) {
        this.logger.warn(
          `ML /predict returned HTTP ${response.status} for description "${description.slice(0, 60)}"`,
        );
        return null;
      }

      let data: { category_slug: string; confidence: number };
      try {
        data = (await response.json()) as { category_slug: string; confidence: number };
      } catch (parseErr) {
        this.logger.warn(
          `ML /predict returned invalid JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
        );
        return null;
      }

      return {
        suggestedCategorySlug: data.category_slug,
        confidence: data.confidence,
      };
    } catch (err) {
      // Timeout, network error — degrade silently
      this.logger.warn(
        `ML categorisation unavailable: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  /**
   * Check whether the Python ML service is reachable (for health endpoints and ops).
   * Uses a short timeout (2s) so the app health check does not block.
   *
   * Returns { available: true, categoriesCount?: number } on success,
   * { available: false } on timeout or error.
   */
  async ping(): Promise<{ available: boolean; categoriesCount?: number }> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) return { available: false };

      const data = (await response.json()) as { status?: string; categories?: string[] };
      return {
        available: data.status === 'ok',
        categoriesCount: data.categories?.length,
      };
    } catch {
      return { available: false };
    }
  }

  /**
   * Send a user's category correction to the ML service for future retraining.
   *
   * Fire-and-forget: we intentionally do not await this in normal flows.
   * Errors are logged but never propagated to the caller.
   */
  async sendFeedback(description: string, correctCategorySlug: string): Promise<void> {
    if (!description?.trim()) return;

    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          correct_category_slug: correctCategorySlug,
        }),
      });

      if (!response.ok) {
        this.logger.warn(`ML /feedback returned HTTP ${response.status}`);
      }
    } catch (err) {
      this.logger.warn(
        `ML feedback could not be sent: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Wrap the native fetch with an AbortController-based timeout.
   * Node.js 18+ ships fetch globally; no extra package needed.
   */
  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      return response;
    } catch (err) {
      this.logger.debug(
        `fetchWithTimeout failed for ${url}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
