import type { Range } from '../lib/date'

export type { Range }

export interface PageIcon {
  href: string
  rel: string
  sizes: string
}

/** An schema.org Offer written as microdata (itemscope/itemprop) */
export interface MicrodataOffer {
  name: string
  price: string
  lowPrice: string
  priceCurrency: string
}

/** What the content script reads off the page. Plain JSON: it travels through chrome.scripting.executeScript */
export interface PageSnapshot {
  url: string
  canonicalUrl: string | null
  title: string
  lang: string
  /** Only the useful metas (Open Graph, Twitter, product, price, description) */
  metas: Record<string, string>
  jsonLd: unknown[]
  offers: MicrodataOffer[]
  icons: PageIcon[]
  /** The visible text of the page, one line per block */
  text: string
}

export type Confidence = 'high' | 'medium' | 'low'
export type PlanSource = 'jsonld' | 'microdata' | 'meta' | 'text'

/** One price the page offers */
export interface PlanCandidate {
  /** Plan name as the page writes it, or '' */
  label: string
  amount: number
  /** ISO 4217, or null when the page does not say */
  currency: string | null
  /** The currency came from an ambiguous symbol such as $, ¥ or kr */
  currencyGuessed: boolean
  /** null when the page does not say how often it renews */
  billingFreq: number | null
  billingRange: Range | null
  oneTime: boolean
  /** "from $X": the lowest of several prices */
  from: boolean
  /** The page marks this plan as popular or recommended */
  highlighted: boolean
  /** The yearly amount is the monthly price times 12 because the page says it is billed annually */
  billedAnnually: boolean
  source: PlanSource
  confidence: Confidence
}

export interface Trial {
  freq: number
  range: Range
}

export interface Extraction {
  name: string
  /** Origin of the site, e.g. https://example.com, or '' */
  website: string
  /** Absolute URL of the site's logo or icon, or '' */
  logo: string
  /** schema.org applicationCategory or similar, only used to match the person's categories */
  categoryHint: string
  plans: PlanCandidate[]
  /** Index into `plans` of the plan to start with, -1 when there are none */
  selected: number
  /** Of the selected plan; 'none' when the page shows no price */
  confidence: Confidence | 'none'
  /** The length of the free trial when the page gives it */
  trial: Trial | null
  /** The page talks about a free trial (whether or not it gives the length) */
  trialMentioned: boolean
}
