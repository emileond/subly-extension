import { CURRENCY_CODES } from '../extract/currency'
import type { PlanCandidate } from '../extract/types'

export function formatMoney(amount: number, currency: string | null): string {
  if (!currency) return String(amount)
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}

const UNIT: Record<string, string> = { day: 'day', week: 'week', month: 'month', year: 'year' }

export function cycleLabel(freq: number | null, range: string | null): string {
  if (!range) return ''
  return freq && freq > 1 ? `every ${freq} ${UNIT[range]}s` : `/ ${UNIT[range]}`
}

/** "$10.00 / month", "$59.00 one-time", "€9.99 (renewal not found)" */
export function planPrice(plan: PlanCandidate, fallbackCurrency: string): string {
  const price = formatMoney(plan.amount, plan.currency ?? fallbackCurrency)
  if (plan.oneTime) return `${price} one-time`
  if (!plan.billingRange) return `${price} (renewal not found)`
  return `${plan.from ? 'from ' : ''}${price} ${cycleLabel(plan.billingFreq, plan.billingRange)}`
}

let cachedCurrencies: { code: string; name: string }[] | null = null

/** Every currency the browser knows, with its English name; falls back to the common ones */
export function currencyOptions(extra: string[] = []): { code: string; name: string }[] {
  if (!cachedCurrencies) {
    const codes: string[] =
      typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('currency') : [...CURRENCY_CODES]
    let names: Intl.DisplayNames | null = null
    try {
      names = new Intl.DisplayNames(['en'], { type: 'currency' })
    } catch {
      names = null
    }
    cachedCurrencies = codes.map((code) => ({ code, name: names?.of(code) ?? code }))
  }
  const missing = extra.filter((c) => c && !cachedCurrencies!.some((o) => o.code === c)).map((code) => ({ code, name: code }))
  return [...missing, ...cachedCurrencies]
}
