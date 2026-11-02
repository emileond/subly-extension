import {
  AMBIGUOUS_SYMBOLS,
  CURRENCY_CODES,
  UNAMBIGUOUS_SYMBOLS,
  resolveCurrency,
  type LocaleHints,
} from './currency'

/** "9.99", "9,99", "1,200", "1.299,00", "1 299,00", "1'200.50" -> a number, or null */
export function parseNumber(input: string): number | null {
  let s = input.replace(/[\s\u00a0\u202f'’]/g, '')
  if (!/^\d[\d.,]*$/.test(s)) return null
  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')

  if (lastDot !== -1 && lastComma !== -1) {
    // Both present: the one that comes last is the decimal mark
    const decimal = lastDot > lastComma ? '.' : ','
    const group = decimal === '.' ? ',' : '.'
    s = s.split(group).join('').replace(decimal, '.')
  } else if (lastDot !== -1 || lastComma !== -1) {
    const mark = lastDot !== -1 ? '.' : ','
    const pieces = s.split(mark)
    const tail = pieces[pieces.length - 1]
    const isGrouping = pieces.length > 2 || (tail.length === 3 && pieces[0].length <= 3 && pieces[0] !== '0')
    s = isGrouping ? pieces.join('') : pieces.join('.')
  }
  const value = Number(s)
  return Number.isFinite(value) ? value : null
}

const NUM = String.raw`\d{1,3}(?:[ ,.'’\u00a0\u202f]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?`
const escape = (s: string) => s.replace(/[$.*+?^()[\]{}|\\]/g, '\\$&')

const codes = CURRENCY_CODES.join('|')
const symbols = [...UNAMBIGUOUS_SYMBOLS.map(([s]) => s), ...AMBIGUOUS_SYMBOLS]
  .sort((a, b) => b.length - a.length)
  .map(escape)
  .join('|')
// Word-like symbols (kr, zł, RM) must not be part of a longer word
const MONEY = new RegExp(
  String.raw`(?:(?<![A-Za-z])(?<c1>${codes}|${symbols})(?![A-Za-z])\s{0,2}(?<n1>${NUM})(?![\d])` +
    String.raw`|(?<![\d.,])(?<n2>${NUM})\s{0,2}(?<c2>${codes}|${symbols})(?![A-Za-z]))`,
  'g'
)
const TRAILING_CODE = new RegExp(String.raw`^\s{0,2}(${codes})\b`)

export interface Money {
  amount: number
  currency: string | null
  currencyGuessed: boolean
  /** Position in the scanned text, [index, end) */
  index: number
  end: number
}

const NOISE_BEFORE =
  /(?:save|saving|savings|off|worth|up to|credit|bonus|was|reg\.?|regular price|value of|valued at|ahorra|ahorras|économisez|economisez|sparen|spare|rabatt|descuento|desconto)\s*$/i
const NOISE_AFTER = /^\s*(?:off\b|discount|de descuento|de réduction|rabatt)/i

/** Every price written in `text`, in order. Amounts that are discounts or credits ("Save $20", "$10 off") are left out. */
export function findMoney(text: string, hints: LocaleHints): Money[] {
  const found: Money[] = []
  for (const match of text.matchAll(MONEY)) {
    const groups = match.groups ?? {}
    const symbol = groups.c1 ?? groups.c2
    const number = groups.n1 ?? groups.n2
    if (!symbol || !number || match.index === undefined) continue
    const amount = parseNumber(number)
    if (amount === null || amount > 1_000_000) continue

    let end = match.index + match[0].length
    let { currency, guessed } = resolveCurrency(symbol, hints)
    // "$9.99 USD": a code written after the amount is more exact than the symbol
    const trailing = TRAILING_CODE.exec(text.slice(end))
    if (trailing) {
      currency = trailing[1]
      guessed = false
      end += trailing[0].length
    }

    const before = text.slice(Math.max(0, match.index - 16), match.index)
    if (NOISE_BEFORE.test(before) || NOISE_AFTER.test(text.slice(end, end + 20))) continue
    found.push({ amount, currency, currencyGuessed: guessed, index: match.index, end })
  }
  return found
}

/** A price in a structured field: "9.99", "9,99", "$9.99", 9.99 */
export function parsePriceValue(
  value: unknown,
  hints: LocaleHints
): { amount: number; currency: string | null } | null {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? { amount: value, currency: null } : null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  const money = findMoney(trimmed, hints)[0]
  if (money) return { amount: money.amount, currency: money.currency }
  const amount = parseNumber(trimmed)
  return amount !== null && amount >= 0 ? { amount, currency: null } : null
}
