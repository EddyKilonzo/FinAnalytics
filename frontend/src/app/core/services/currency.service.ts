import { Injectable, signal } from '@angular/core'

const STORAGE_KEY = 'finanalytics-currency'

/**
 * All monetary values in the database are stored in KES.
 * These rates convert 1 KES → target currency (indicative mid-market rates).
 * Update periodically or replace with a live-rates API call.
 */
const KES_RATES: Record<string, number> = {
  KES: 1,
  USD: 0.00775,   // 1 KES ≈ 0.00775 USD  (1 USD ≈ 129 KES)
  EUR: 0.00714,   // 1 KES ≈ 0.00714 EUR  (1 EUR ≈ 140 KES)
  GBP: 0.00610,   // 1 KES ≈ 0.00610 GBP  (1 GBP ≈ 164 KES)
  UGX: 28.5,      // 1 KES ≈ 28.5 UGX
  TZS: 20.4,      // 1 KES ≈ 20.4 TZS
}

export const CURRENCIES = [
  { code: 'KES', label: 'KES — Kenyan Shilling',    locale: 'en-KE' },
  { code: 'USD', label: 'USD — US Dollar',           locale: 'en-US' },
  { code: 'EUR', label: 'EUR — Euro',                locale: 'de-DE' },
  { code: 'GBP', label: 'GBP — British Pound',       locale: 'en-GB' },
  { code: 'UGX', label: 'UGX — Ugandan Shilling',    locale: 'en-UG' },
  { code: 'TZS', label: 'TZS — Tanzanian Shilling',  locale: 'sw-TZ' },
]

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  readonly currency = signal<string>(
    (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null) ?? 'KES'
  )

  setCurrency(code: string): void {
    this.currency.set(code)
    try { localStorage.setItem(STORAGE_KEY, code) } catch { /* ignore */ }
  }

  /** Convert a KES amount to the currently selected currency. */
  convert(kesValue: number): number {
    const rate = KES_RATES[this.currency()] ?? 1
    return kesValue * rate
  }

  /**
   * Format a KES value in the selected currency.
   * Conversion is applied automatically — pass raw KES values.
   */
  format(kesValue: number, opts?: { decimals?: number }): string {
    const code = this.currency()
    const converted = this.convert(kesValue)
    const entry = CURRENCIES.find(c => c.code === code)
    const locale = entry?.locale ?? 'en-KE'
    // Use 2 decimals for small-unit currencies (USD/EUR/GBP), 0 for large-unit (KES/UGX/TZS)
    const defaultDecimals = ['USD', 'EUR', 'GBP'].includes(code) ? 2 : 0
    const fractionDigits = opts?.decimals ?? defaultDecimals
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        maximumFractionDigits: fractionDigits,
        minimumFractionDigits: fractionDigits,
      }).format(converted)
    } catch {
      return `${code} ${converted.toLocaleString()}`
    }
  }
}
