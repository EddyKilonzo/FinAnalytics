import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import type { AuthUser } from '../../auth/strategies/jwt.strategy';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  requestId?: string;
}

/**
 * Global HTTP logging interceptor.
 *
 * Attaches a unique requestId to every request so correlated log lines
 * can be tracked across services/retries.
 *
 * Log levels:
 *   LOG   — 2xx (success)
 *   WARN  — 4xx (client error)
 *   ERROR — 5xx (server error, logged on error path)
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Attach a unique ID so the same request can be traced in all log lines
    req.requestId = randomUUID();

    const { method, url, ip } = req;
    const userAgent = req.get('user-agent') ?? '-';
    const userId = req.user?.id ?? 'anonymous';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse<Response>();
          const status = res.statusCode;
          const ms = Date.now() - start;
          const line = `[${req.requestId}] ${method} ${url} → ${status} (${ms}ms) user=${userId} ${ip} "${userAgent}"`;

          if (status >= 500) {
            this.logger.error(line);
          } else if (status >= 400) {
            this.logger.warn(line);
          } else {
            this.logger.log(line);
          }
        },
        error: (err: unknown) => {
          const ms = Date.now() - start;
          const status =
            typeof err === 'object' && err !== null && 'status' in err
              ? (err as { status: number }).status
              : 500;
          const line = `[${req.requestId}] ${method} ${url} → ${status} ERROR (${ms}ms) user=${userId} ${ip} "${userAgent}"`;
          this.logger.error(line);
        },
      }),
    );
  }
}
