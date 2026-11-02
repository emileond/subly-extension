import { addCycle, toDateInput } from '../lib/date'
import { normalizeCurrencyCode, type LocaleHints } from './currency'
import { detectCycle, detectTrial, isBilledAnnually, isOneTime } from './cycle'
import { readJsonLd } from './jsonld'
import { brandFromHost, brandLabel, cleanBrand, segmentMatchingHost, titleSegments } from './name'
import { findMoney, parsePriceValue } from './price'
import type { Confidence, Extraction, PageSnapshot, PlanCandidate, Range, Trial } from './types'

const MAX_PLANS = 8

const HIGHLIGHT =
  /\b(?:most popular|popular|recommended|best value|best seller|our pick|top choice|most chosen|más popular|recomendado|mejor valor|le plus populaire|populaire|recommandé|beliebt|empfohlen|beliebteste|più popolare|consigliato|mais popular|recomendado)\b/i
const FROM = /\b(?:from|starting at|starts at|starting from|as low as|desde|a partir de|à partir de|dès|ab|a partire da)\s*$/i
const LABEL_STOP =
  /^(?:monthly|yearly|annual|annually|billed|per|month|year|save|popular|most|recommended|best|get|choose|select|buy|subscribe|sign|try|start|free|pricing|plans?|compare|features?|includes?|everything|contact|learn|cancel|mensual|anual|mes|año|más|mejor|elige|comprar|empieza|prueba|beliebt|empfohlen|monatlich|jährlich|monat|jahr|kostenlos|from|starting|then|after|for|only|just|today|now|per user|was|billed|and|or)\b/i

function safeUrl(value: string): URL | null {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

function isLabelLine(line: string): boolean {
  if (/\d/.test(line) || line.length < 2 || line.length > 22) return false
  const words = line.split(/\s+/)
  return words.length <= 2 && /^\p{Lu}/u.test(line) && !LABEL_STOP.test(line) && !/[.:!?,]$/.test(line)
}

function score(plan: Omit<PlanCandidate, 'confidence'>): Confidence {
  let points = plan.source === 'text' ? 1 : 2
  if (plan.billingRange || plan.oneTime) points += 1
  if (plan.from || plan.currencyGuessed || plan.currency === null) points -= 1
  if (plan.billedAnnually) points -= 1
  return points >= 3 ? 'high' : points === 2 ? 'medium' : 'low'
}

function build(partial: Omit<PlanCandidate, 'confidence'>): PlanCandidate {
  return { ...partial, confidence: score(partial) }
}

interface TextPlan {
  plan: PlanCandidate
  line: number
}

/** Prices in the visible text, each with the plan name above it and the period after it */
function plansFromText(lines: string[], hints: LocaleHints): TextPlan[] {
  const found: TextPlan[] = []
  const withMoney = lines.map((l) => findMoney(l, hints))

  lines.forEach((line, i) => {
    const prices = withMoney[i]
    prices.forEach((price, k) => {
      if (price.amount <= 0) return
      const next = prices[k + 1]
      const after = line.slice(price.end, next ? next.index : price.end + 90)

      // The period is usually right after the price, else on the next short lines ("/ month", "billed annually")
      const following: string[] = [after]
      if (!next) {
        for (let j = i + 1; j <= i + 2 && j < lines.length; j++) {
          if (withMoney[j].length > 0 || lines[j].length > 90) break
          following.push(lines[j])
        }
      }
      const window = following.join(' \n ')
      // "$59 one-time payment" on the price's own line beats a period mentioned on a line below it
      const sameLine = detectCycle(after)
      const oneTime = !sameLine && isOneTime(line)
      const spoken = oneTime
        ? null
        : sameLine ?? detectCycle(window) ?? detectCycle(line.slice(Math.max(0, price.index - 30), price.index))
      const from = FROM.test(line.slice(Math.max(0, price.index - 24), price.index))

      let label = ''
      let highlighted = prices.length === 1 && HIGHLIGHT.test(line)
      if (!label && price.index > 0) {
        const lead = line.slice(0, price.index).trim()
        if (isLabelLine(lead)) label = lead
      }
      for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
        if (withMoney[j].length > 0) break
        if (HIGHLIGHT.test(lines[j])) {
          highlighted = true
          continue
        }
        if (isLabelLine(lines[j])) {
          label ||= lines[j]
          // A badge ("Most popular") sits just above the plan name
          if (j > 0 && withMoney[j - 1].length === 0 && HIGHLIGHT.test(lines[j - 1])) highlighted = true
          break
        }
        // A "Monthly" / "Yearly" line starts a new block: whatever is above it is not this plan's name
        if (LABEL_STOP.test(lines[j]) && lines[j].length < 24) break
      }

      let amount = price.amount
      let freq = spoken?.freq ?? null
      let range: Range | null = spoken?.range ?? null
      let billedAnnually = false
      if (spoken && spoken.range === 'month' && spoken.freq === 1 && isBilledAnnually(window)) {
        amount = Math.round(amount * 12 * 100) / 100
        freq = 1
        range = 'year'
        billedAnnually = true
      }

      found.push({
        line: i,
        plan: build({
          label,
          amount,
          currency: price.currency,
          currencyGuessed: price.currencyGuessed,
          billingFreq: freq,
          billingRange: range,
          oneTime,
          from,
          highlighted,
          billedAnnually,
          source: 'text',
        }),
      })
    })
  })
  return found
}

const sameAmount = (a: number, b: number) => Math.abs(a - b) < 0.005

function structuredPlans(snap: PageSnapshot, hints: LocaleHints, facts: ReturnType<typeof readJsonLd>): Omit<PlanCandidate, 'confidence'>[] {
  const plans: Omit<PlanCandidate, 'confidence'>[] = []
  const base = {
    currencyGuessed: false, oneTime: false, highlighted: false, billedAnnually: false,
  }

  for (const offer of facts.offers) {
    if (offer.amount <= 0) continue
    plans.push({
      ...base, label: offer.label, amount: offer.amount, currency: offer.currency,
      billingFreq: offer.billingFreq, billingRange: offer.billingRange, from: offer.from, source: 'jsonld',
    })
  }

  for (const offer of snap.offers) {
    const value = parsePriceValue(offer.price || offer.lowPrice, hints)
    if (!value || value.amount <= 0) continue
    const spoken = detectCycle(offer.name)
    plans.push({
      ...base, label: offer.name, amount: value.amount,
      currency: normalizeCurrencyCode(offer.priceCurrency) ?? value.currency,
      billingFreq: spoken?.freq ?? null, billingRange: spoken?.range ?? null,
      from: !offer.price && Boolean(offer.lowPrice), source: 'microdata',
    })
  }

  const m = snap.metas
  const metaPrice = parsePriceValue(
    m['product:price:amount'] ?? m['og:price:amount'] ?? m['itemprop:price'] ?? m['price'],
    hints
  )
  if (metaPrice && metaPrice.amount > 0) {
    const currency =
      normalizeCurrencyCode(
        m['product:price:currency'] ?? m['og:price:currency'] ?? m['itemprop:pricecurrency'] ?? m['pricecurrency'] ?? m['currency']
      ) ?? metaPrice.currency
    plans.push({
      ...base, label: '', amount: metaPrice.amount, currency, billingFreq: null, billingRange: null,
      from: false, source: 'meta',
    })
  }
  for (const n of ['1', '2']) {
    if (!/price|precio|prix|preis/i.test(m[`twitter:label${n}`] ?? '')) continue
    const value = parsePriceValue(m[`twitter:data${n}`], hints)
    if (!value || value.amount <= 0) continue
    const spoken = detectCycle(m[`twitter:data${n}`])
    plans.push({
      ...base, label: '', amount: value.amount, currency: value.currency,
      billingFreq: spoken?.freq ?? null, billingRange: spoken?.range ?? null, from: false, source: 'meta',
    })
  }
  return plans
}

/** The same price found twice (JSON-LD and a meta tag) is one plan; the more trusted copy keeps its fields and gains what the other knew */
function mergeSame(plans: Omit<PlanCandidate, 'confidence'>[]): Omit<PlanCandidate, 'confidence'>[] {
  const out: Omit<PlanCandidate, 'confidence'>[] = []
  for (const plan of plans) {
    const twin = out.find(
      (p) =>
        sameAmount(p.amount, plan.amount) &&
        (p.currency === plan.currency || !p.currency || !plan.currency) &&
        (p.billingRange === plan.billingRange || !p.billingRange || !plan.billingRange) &&
        (p.label === plan.label || !p.label || !plan.label)
    )
    if (!twin) {
      out.push({ ...plan })
      continue
    }
    twin.currency ??= plan.currency
    twin.billingRange ??= plan.billingRange
    twin.billingFreq ??= plan.billingFreq
    twin.label ||= plan.label
    twin.highlighted ||= plan.highlighted
  }
  return out
}

/** Chooses the plan to start with: the one the page highlights, else the cheapest paid monthly one, else the cheapest by month */
export function pickPlan(plans: PlanCandidate[]): number {
  if (plans.length === 0) return -1
  const highlighted = plans.findIndex((p) => p.highlighted)
  if (highlighted !== -1) return highlighted
  const monthly = plans
    .map((plan, index) => ({ plan, index }))
    .filter(({ plan }) => plan.billingRange === 'month' && plan.billingFreq === 1 && !plan.oneTime)
  if (monthly.length) return monthly.reduce((a, b) => (b.plan.amount < a.plan.amount ? b : a)).index

  const perMonth = (p: PlanCandidate) => {
    const months = { day: 1 / 30, week: 12 / 52, month: 1, year: 12 }[p.billingRange ?? 'month'] * (p.billingFreq ?? 1)
    return p.amount / months
  }
  const recurring = plans.map((plan, index) => ({ plan, index })).filter(({ plan }) => !plan.oneTime)
  if (recurring.length) return recurring.reduce((a, b) => (perMonth(b.plan) < perMonth(a.plan) ? b : a)).index
  return 0
}

function pickLogo(snap: PageSnapshot, fromJsonLd: string): string {
  const ok = (href: string) => safeUrl(href) !== null && href.length <= 480
  if (fromJsonLd) {
    try {
      const resolved = new URL(fromJsonLd, snap.url).href
      if (ok(resolved)) return resolved
    } catch {
      /* fall through to the page icons */
    }
  }
  const size = (sizes: string) => {
    const m = /(\d+)x(\d+)/.exec(sizes)
    return m ? Number(m[1]) : sizes === 'any' ? 256 : 32
  }
  const ranked = snap.icons
    .filter((icon) => ok(icon.href))
    .map((icon) => ({
      icon,
      points: size(icon.sizes) + (icon.rel.startsWith('apple-touch-icon') ? 1000 : 0) - (/\.ico(\?|$)/i.test(icon.href) ? 500 : 0),
    }))
    .sort((a, b) => b.points - a.points)
  return ranked[0]?.icon.href ?? ''
}

function pickName(snap: PageSnapshot, host: string, facts: ReturnType<typeof readJsonLd>): string {
  const fromMeta =
    cleanBrand(snap.metas['og:site_name'], host) ||
    cleanBrand(snap.metas['application-name'], host) ||
    cleanBrand(snap.metas['apple-mobile-web-app-title'], host)
  if (fromMeta) return fromMeta

  const fromLd = cleanBrand(facts.siteName, host) || cleanBrand(facts.orgName, host) || cleanBrand(facts.brandName, host)
  if (fromLd) return fromLd

  const segments = titleSegments(snap.title || snap.metas['og:title'] || '')
  const fromTitle = segmentMatchingHost(segments, host)
  if (fromTitle) return fromTitle

  return cleanBrand(facts.appName, host) || brandFromHost(host) || segments[0] || ''
}

/** Everything the page tells us about what is being sold; unknown fields stay empty */
export function extract(snap: PageSnapshot): Extraction {
  const page = safeUrl(snap.url)
  const host = page?.hostname ?? ''
  const hints: LocaleHints = { lang: snap.lang, host }
  const facts = readJsonLd(snap.jsonLd, hints)
  const lines = snap.text.split('\n').filter(Boolean)

  const canonical = snap.canonicalUrl ? safeUrl(snap.canonicalUrl) : null
  const site = canonical && brandLabel(canonical.hostname) === brandLabel(host) ? canonical : page
  const website = site ? site.origin : ''

  const textPlans = plansFromText(lines, hints)
  let structured = mergeSame(structuredPlans(snap, hints, facts))
  const textOnly = textPlans.map((t) => t.plan)

  // An AggregateOffer ("from $5") says less than the plans the page lists
  if (structured.length > 0 && structured.every((p) => p.from) && textOnly.length > 0) structured = []

  // Fill what structured data left out from the text: the same price in the text may carry the period and the highlight
  for (const plan of structured) {
    const twin =
      textOnly.find((t) => sameAmount(t.amount, plan.amount) && t.billingRange && (!plan.label || !t.label || t.label === plan.label)) ??
      textOnly.find((t) => sameAmount(t.amount, plan.amount))
    if (twin && !plan.billingRange && twin.billingRange && !twin.billedAnnually) {
      plan.billingRange = twin.billingRange
      plan.billingFreq = twin.billingFreq
    }
    if (twin && !plan.currency && twin.currency && !twin.currencyGuessed) plan.currency = twin.currency
    if (!plan.billingRange && !plan.billingFreq) plan.oneTime = twin?.oneTime ?? false
    plan.highlighted ||= textOnly.some((t) => t.highlighted && (sameAmount(t.amount, plan.amount) || (t.label && t.label === plan.label)))
  }

  const chosen: PlanCandidate[] =
    structured.length > 0
      ? structured.map(build)
      : mergeSame(textOnly).map(build)
  const plans = chosen.slice(0, MAX_PLANS)
  const selected = pickPlan(plans)

  const trialText = [snap.title, snap.metas['description'], snap.metas['og:description'], snap.text].join('\n')
  const trialFound = detectTrial(trialText)
  const trial: Trial | null = trialFound.found ? trialFound.trial : null

  return {
    name: pickName(snap, host, facts),
    website,
    logo: pickLogo(snap, facts.logo),
    categoryHint: facts.applicationCategory,
    plans,
    selected,
    confidence: selected === -1 ? 'none' : plans[selected].confidence,
    trial,
    trialMentioned: trialFound.found,
  }
}

/** The next charge to suggest: after the free trial when the page names its length, else one cycle from today (the person edits it) */
export function suggestNextCharge(
  plan: Pick<PlanCandidate, 'billingFreq' | 'billingRange' | 'oneTime'> | null,
  trial: Trial | null,
  today: Date
): string {
  if (trial) return toDateInput(addCycle(today, trial.freq, trial.range))
  if (plan?.oneTime) return toDateInput(today)
  return toDateInput(addCycle(today, plan?.billingFreq ?? 1, plan?.billingRange ?? 'month'))
}

/** Which of the person's categories a hint such as "BusinessApplication" or the server's suggestion points to; '' when none */
export function matchCategory(hint: string, categories: string[]): string {
  const key = (s: string) => s.toLowerCase().replace(/application$/i, '').replace(/[^a-z0-9]/g, '')
  const wanted = key(hint)
  if (!wanted) return ''
  return categories.find((c) => key(c) === wanted) ?? categories.find((c) => key(c).includes(wanted) || (wanted.includes(key(c)) && key(c).length >= 4)) ?? ''
}

