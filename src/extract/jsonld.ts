import { detectCycle } from './cycle'
import { normalizeCurrencyCode } from './currency'
import { parsePriceValue } from './price'
import type { LocaleHints } from './currency'
import type { Range } from './types'

type Node = Record<string, unknown>

export interface JsonLdOffer {
  label: string
  amount: number
  currency: string | null
  currencyGuessed: boolean
  billingFreq: number | null
  billingRange: Range | null
  from: boolean
}

export interface JsonLdFacts {
  offers: JsonLdOffer[]
  siteName: string
  orgName: string
  brandName: string
  appName: string
  logo: string
  applicationCategory: string
}

const isNode = (value: unknown): value is Node => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const typesOf = (node: Node): string[] => {
  const raw = node['@type']
  const list = Array.isArray(raw) ? raw : [raw]
  return list.filter((t): t is string => typeof t === 'string').map((t) => t.replace(/^.*[/#]/, ''))
}

const text = (value: unknown): string => {
  if (typeof value === 'string') return value.trim()
  if (isNode(value) && typeof value.name === 'string') return value.name.trim()
  return ''
}

const OFFER_TYPES = new Set(['Offer', 'AggregateOffer', 'Subscription'])
const SPEC_TYPES = new Set(['UnitPriceSpecification', 'PriceSpecification', 'CompoundPriceSpecification'])
const ORG_TYPES = new Set(['Organization', 'Corporation', 'LocalBusiness', 'NGO', 'OnlineBusiness', 'Brand'])
const APP_TYPES = new Set(['SoftwareApplication', 'WebApplication', 'MobileApplication', 'Service', 'OnlineService'])

/** Walks the blocks (arrays, @graph, nested objects) and calls `visit` on every typed object with the chain of its parents' types */
function walk(blocks: unknown[], visit: (node: Node, insideOffer: boolean) => void) {
  let budget = 600
  const go = (value: unknown, insideOffer: boolean, depth: number) => {
    if (budget-- <= 0 || depth > 8) return
    if (Array.isArray(value)) return value.forEach((v) => go(v, insideOffer, depth + 1))
    if (!isNode(value)) return
    const types = typesOf(value)
    const isOffer = types.some((t) => OFFER_TYPES.has(t)) || ('price' in value && 'priceCurrency' in value)
    if (types.length) visit(value, insideOffer)
    else if (isOffer) visit(value, insideOffer)
    for (const [key, child] of Object.entries(value)) {
      if (key === '@context') continue
      go(child, insideOffer || isOffer, depth + 1)
    }
  }
  go(blocks, false, 0)
}

const UNIT_CODES: Record<string, Range> = {
  MON: 'month', MONTH: 'month', MONTHS: 'month', P1M: 'month',
  ANN: 'year', YEAR: 'year', YEARS: 'year', P1Y: 'year', YR: 'year',
  WEE: 'week', WEEK: 'week', WEEKS: 'week', P1W: 'week',
  DAY: 'day', DAYS: 'day', P1D: 'day',
}

function cycleFromValue(value: unknown): { freq: number; range: Range } | null {
  if (typeof value === 'string') {
    const iso = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/i.exec(value.trim())
    if (iso && value.trim().length > 1) {
      const [, y, m, w, d] = iso
      if (y && !m && !w && !d) return { freq: Number(y), range: 'year' }
      if (m && !y && !w && !d) return Number(m) % 12 === 0 ? { freq: Number(m) / 12, range: 'year' } : { freq: Number(m), range: 'month' }
      if (w && !y && !m && !d) return { freq: Number(w), range: 'week' }
      if (d && !y && !m && !w) return Number(d) % 7 === 0 && Number(d) >= 7 ? { freq: Number(d) / 7, range: 'week' } : { freq: Number(d), range: 'day' }
      return null
    }
    const code = UNIT_CODES[value.trim().toUpperCase()]
    if (code) return { freq: 1, range: code }
    return null
  }
  if (isNode(value)) {
    // QuantitativeValue { value: 1, unitCode: "MON" } or { unitText: "month" }
    const unit = cycleFromValue(value.unitCode) ?? cycleFromValue(value.unitText)
    if (unit) {
      const n = Number(value.value)
      return { freq: Number.isInteger(n) && n > 0 ? n : 1, range: unit.range }
    }
  }
  return null
}

function cycleFromSpec(spec: Node): { freq: number; range: Range } | null {
  return (
    cycleFromValue(spec.billingDuration) ??
    cycleFromValue(spec.referenceQuantity) ??
    cycleFromValue(spec.eligibleDuration) ??
    cycleFromValue(spec.unitCode) ??
    cycleFromValue(spec.unitText) ??
    cycleFromValue(spec.billingPeriod) ??
    null
  )
}

function readOffer(node: Node, hints: LocaleHints): JsonLdOffer | null {
  // An AggregateOffer that lists its offers is read through those
  if (typesOf(node).includes('AggregateOffer') && Array.isArray(node.offers) && node.offers.length) return null

  const specs: Node[] = [node, ...[node.priceSpecification].flat().filter(isNode)]
  let price: ReturnType<typeof parsePriceValue> = null
  let currency: string | null = null
  let cycle: { freq: number; range: Range } | null = null
  let from = false

  for (const spec of specs) {
    if (!price) {
      const value = spec.price ?? (spec.lowPrice !== undefined ? spec.lowPrice : undefined)
      price = parsePriceValue(value, hints)
      if (price && spec.price === undefined && spec.highPrice !== undefined && Number(spec.highPrice) > price.amount) from = true
    }
    currency ??= normalizeCurrencyCode(spec.priceCurrency)
    cycle ??= cycleFromSpec(spec)
  }
  if (!price) return null

  const label = text(node.name) || text((node.priceSpecification as Node | undefined)?.name) || ''
  const words = [label, text(node.description), text(node.category)].join(' ')
  const spoken = cycle ? null : detectCycle(words)

  return {
    label,
    amount: price.amount,
    currency: currency ?? price.currency,
    currencyGuessed: false,
    billingFreq: cycle?.freq ?? spoken?.freq ?? null,
    billingRange: cycle?.range ?? spoken?.range ?? null,
    from,
  }
}

const logoOf = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return logoOf(value[0])
  if (isNode(value)) return typeof value.url === 'string' ? value.url : typeof value.contentUrl === 'string' ? value.contentUrl : ''
  return ''
}

/** Reads the facts the extension needs out of the page's JSON-LD blocks */
export function readJsonLd(blocks: unknown[], hints: LocaleHints): JsonLdFacts {
  const facts: JsonLdFacts = {
    offers: [], siteName: '', orgName: '', brandName: '', appName: '', logo: '', applicationCategory: '',
  }

  walk(blocks, (node, insideOffer) => {
    const types = typesOf(node)
    const offerLike = types.some((t) => OFFER_TYPES.has(t)) || ('price' in node && 'priceCurrency' in node)
    const specLike = types.some((t) => SPEC_TYPES.has(t))
    if (offerLike || (specLike && !insideOffer)) {
      const offer = readOffer(node, hints)
      if (offer) facts.offers.push(offer)
    }
    if (types.includes('WebSite')) facts.siteName ||= text(node.name) || text(node.alternateName)
    if (types.some((t) => ORG_TYPES.has(t))) {
      facts.orgName ||= text(node.name) || text(node.alternateName)
      facts.logo ||= logoOf(node.logo)
    }
    if (types.some((t) => APP_TYPES.has(t))) {
      facts.appName ||= text(node.name)
      if (typeof node.applicationCategory === 'string') facts.applicationCategory ||= node.applicationCategory
    }
    facts.brandName ||= text(node.brand)
    if (!facts.orgName) facts.orgName = text(node.publisher) || text(node.provider) || text(node.seller)
  })

  return facts
}
