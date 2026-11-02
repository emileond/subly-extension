export type Range = 'day' | 'week' | 'month' | 'year'

const pad = (n: number) => String(n).padStart(2, '0')

/** YYYY-MM-DD in the person's local time (toISOString would shift the day for most time zones) */
export function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function isDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

/** `date` plus `freq` ranges; a month or year that is too short for the day lands on its last day (Jan 31 + 1 month = Feb 28) */
export function addCycle(date: Date, freq: number, range: Range): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (range === 'day') next.setDate(next.getDate() + freq)
  else if (range === 'week') next.setDate(next.getDate() + 7 * freq)
  else {
    const months = range === 'year' ? freq * 12 : freq
    const day = next.getDate()
    next.setDate(1)
    next.setMonth(next.getMonth() + months)
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
    next.setDate(Math.min(day, lastDay))
  }
  return next
}
