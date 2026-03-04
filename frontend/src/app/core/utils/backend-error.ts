import { HttpErrorResponse } from '@angular/common/http';

/**
 * Backend returns { message: string | string[], errors?: string[] }.
 * Use errors[] when present (validation details), else message (string or joined).
 */
export function getBackendErrorMessage(
  err: HttpErrorResponse,
  fallback: string
): string {
  try {
    const body = err?.error;
    if (!body || typeof body !== 'object') {
      return fallback;
    }
    const errors = body.errors as string[] | undefined;
    const message = body.message;
    if (errors?.length) {
      return errors.join('. ');
    }
    if (Array.isArray(message)) {
      return message.length ? message.join('. ') : fallback;
    }
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    if (typeof body.error === 'string' && body.error.trim()) {
      return body.error;
    }
    return fallback;
  } catch {
    return fallback;
  }
}
