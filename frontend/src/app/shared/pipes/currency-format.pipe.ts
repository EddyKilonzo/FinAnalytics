import { Pipe, PipeTransform, inject } from '@angular/core'
import { CurrencyService } from '../../core/services/currency.service'

/**
 * Formats a number using the user's selected currency.
 * Usage: {{ amount | fmt }}
 * Impure so it re-evaluates when the currency signal changes.
 */
@Pipe({ name: 'fmt', standalone: true, pure: false })
export class CurrencyFormatPipe implements PipeTransform {
  private svc = inject(CurrencyService)

  transform(value: number | null | undefined): string {
    if (value == null) return '—'
    return this.svc.format(value)
  }
}
