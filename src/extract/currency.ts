/** ISO 4217 codes the page text is scanned for. Anything else is left out rather than guessed. */
export const CURRENCY_CODES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CAD', 'AUD', 'NZD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON',
  'BGN', 'HRK', 'ISK', 'TRY', 'RUB', 'UAH', 'ILS', 'AED', 'SAR', 'QAR', 'EGP', 'ZAR', 'NGN', 'KES', 'MAD', 'INR',
  'PKR', 'BDT', 'LKR', 'IDR', 'MYR', 'SGD', 'THB', 'VND', 'PHP', 'HKD', 'TWD', 'KRW', 'MXN', 'BRL', 'ARS', 'CLP',
  'COP', 'PEN', 'UYU',
] as const

const CODE_SET = new Set<string>(CURRENCY_CODES)

export const isCurrencyCode = (value: string) => CODE_SET.has(value.toUpperCase())

/** Symbols that name one currency, longest first so "US$" wins over "$" */
export const UNAMBIGUOUS_SYMBOLS: [string, string][] = [
  ['US$', 'USD'], ['CA$', 'CAD'], ['C$', 'CAD'], ['CAD$', 'CAD'], ['AU$', 'AUD'], ['A$', 'AUD'], ['AUD$', 'AUD'],
  ['NZ$', 'NZD'], ['HK$', 'HKD'], ['SG$', 'SGD'], ['S$', 'SGD'], ['MX$', 'MXN'], ['Mex$', 'MXN'], ['NT$', 'TWD'],
  ['R$', 'BRL'], ['€', 'EUR'], ['£', 'GBP'], ['₹', 'INR'], ['₩', 'KRW'], ['₽', 'RUB'], ['₺', 'TRY'], ['₪', 'ILS'],
  ['₫', 'VND'], ['₱', 'PHP'], ['฿', 'THB'], ['₴', 'UAH'], ['₦', 'NGN'], ['zł', 'PLN'], ['Kč', 'CZK'], ['Ft', 'HUF'],
  ['lei', 'RON'], ['RM', 'MYR'], ['Rp', 'IDR'], ['Rs.', 'INR'], ['Rs', 'INR'], ['Fr.', 'CHF'],
]

/** Symbols shared by several currencies; the page's language or country picks one */
export const AMBIGUOUS_SYMBOLS = ['$', '¥', '￥', 'kr', 'Kr'] as const

const REGION_DOLLAR: Record<string, string> = {
  CA: 'CAD', AU: 'AUD', NZ: 'NZD', MX: 'MXN', AR: 'ARS', CL: 'CLP', CO: 'COP', HK: 'HKD', SG: 'SGD', TW: 'TWD',
  US: 'USD', UY: 'UYU',
}
const TLD_DOLLAR: Record<string, string> = {
  ca: 'CAD', au: 'AUD', nz: 'NZD', mx: 'MXN', ar: 'ARS', cl: 'CLP', hk: 'HKD', sg: 'SGD', tw: 'TWD',
}
const LANG_KRONA: Record<string, string> = { sv: 'SEK', nb: 'NOK', nn: 'NOK', no: 'NOK', da: 'DKK', is: 'ISK' }
const TLD_KRONA: Record<string, string> = { se: 'SEK', no: 'NOK', dk: 'DKK', is: 'ISK' }

export interface LocaleHints {
  /** html lang or og:locale, e.g. "en-CA", "es_MX" */
  lang: string
  /** hostname of the page */
  host: string
}

function parts(hints: LocaleHints) {
  const [language = '', region = ''] = hints.lang.replace('_', '-').split('-')
  const tld = hints.host.split('.').pop() ?? ''
  return { language: language.toLowerCase(), region: region.toUpperCase(), tld: tld.toLowerCase() }
}

export interface ResolvedCurrency {
  currency: string | null
  guessed: boolean
}

/** Maps the symbol or code in front of or behind a number to an ISO code, using the page's locale for $, ¥ and kr */
export function resolveCurrency(symbolOrCode: string, hints: LocaleHints): ResolvedCurrency {
  const token = symbolOrCode.trim()
  if (isCurrencyCode(token)) return { currency: token.toUpperCase(), guessed: false }
  const known = UNAMBIGUOUS_SYMBOLS.find(([symbol]) => symbol === token)
  if (known) return { currency: known[1], guessed: false }

  const { language, region, tld } = parts(hints)
  if (token === '$') {
    const byRegion = REGION_DOLLAR[region]
    if (byRegion) return { currency: byRegion, guessed: false }
    const byTld = TLD_DOLLAR[tld]
    if (byTld) return { currency: byTld, guessed: false }
    // Another country's page that writes plain "$" could mean its own peso or dollar
    const foreign = region && region !== 'US'
    return { currency: 'USD', guessed: Boolean(foreign) }
  }
  if (token === '¥' || token === '￥') {
    const chinese = language === 'zh' || tld === 'cn'
    return { currency: chinese ? 'CNY' : 'JPY', guessed: language !== 'ja' && language !== 'zh' && tld !== 'jp' && tld !== 'cn' }
  }
  if (token === 'kr' || token === 'Kr') {
    const krona = LANG_KRONA[language] ?? TLD_KRONA[tld]
    return krona ? { currency: krona, guessed: false } : { currency: null, guessed: true }
  }
  return { currency: null, guessed: true }
}

/** ISO 4217 code from a structured field (JSON-LD priceCurrency, product:price:currency); null when it is not one we know */
export function normalizeCurrencyCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const code = value.trim().toUpperCase()
  return /^[A-Z]{3}$/.test(code) ? code : null
}
