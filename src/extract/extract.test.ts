// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { fixtureSnapshot } from './__fixtures__'
import { extract, matchCategory, pickPlan, suggestNextCharge } from './extract'

const run = (name: string) =>
  extract(fixtureSnapshot(name))

const summary = (name: string) =>
  run(name).plans.map((p) => `${p.label || '-'} ${p.amount} ${p.currency} ${p.billingFreq ?? '?'}${p.billingRange ?? ''}${p.oneTime ? ' once' : ''} ${p.source}`)

describe('JSON-LD offers', () => {
  const ex = run('jsonld-offers')

  it('reads the brand, the site and the logo', () => {
    expect(ex.name).toBe('Paperly')
    expect(ex.website).toBe('https://www.paperly.com')
    expect(ex.logo).toBe('https://www.paperly.com/brand/logo.png')
    expect(ex.categoryHint).toBe('BusinessApplication')
  })

  it('offers the paid plans with their cycles and skips the free one', () => {
    expect(summary('jsonld-offers')).toEqual([
      'Plus 10 USD 1month jsonld',
      'Business 18 USD 1month jsonld',
    ])
  })

  it('preselects the plan the page highlights', () => {
    expect(ex.plans[ex.selected].label).toBe('Plus')
    expect(ex.plans[ex.selected].highlighted).toBe(true)
    expect(ex.confidence).toBe('high')
  })
})

describe('price metas only', () => {
  const ex = run('meta-price')

  it('takes the price and currency from the metas and leaves the cycle open', () => {
    expect(summary('meta-price')).toEqual(['- 9.99 EUR ? meta'])
    expect(ex.plans[0].billingRange).toBeNull()
    expect(ex.confidence).toBe('medium')
  })

  it('uses the canonical site and the og site name', () => {
    expect(ex.name).toBe('Fieldnotes')
    expect(ex.website).toBe('https://shop.fieldnotes.eu')
    expect(ex.logo).toBe('https://shop.fieldnotes.eu/favicon.svg')
  })
})

describe('plain text with a monthly/yearly toggle', () => {
  const ex = run('toggle-text')

  it('finds the plans by their names and ignores the savings line', () => {
    expect(summary('toggle-text')).toEqual([
      'Starter 9 USD 1month text',
      'Pro 29 USD 1month text',
      'Business 79 USD 1month text',
    ])
  })

  it('cleans the title down to the brand and preselects the highlighted plan', () => {
    expect(ex.name).toBe('Tasklane')
    expect(ex.plans[ex.selected].label).toBe('Pro')
    expect(ex.confidence).toBe('medium')
  })

  it('has no logo it did not see', () => {
    expect(ex.logo).toBe('https://tasklane.io/favicon.png')
  })
})

describe('free trial', () => {
  const ex = run('free-trial')

  it('finds the price after the trial and the trial length', () => {
    expect(summary('free-trial')).toEqual(['- 15.49 USD 1month text'])
    expect(ex.trial).toEqual({ freq: 7, range: 'day' })
    expect(ex.name).toBe('Streamora')
    expect(ex.logo).toBe('https://www.streamora.tv/apple-icon-120.png')
  })

  it('suggests the first charge after the trial', () => {
    const today = new Date(2026, 10, 2)
    expect(suggestNextCharge(ex.plans[0], ex.trial, today)).toBe('2026-11-09')
    expect(suggestNextCharge(ex.plans[0], null, today)).toBe('2026-12-02')
  })
})

describe('non-English pages', () => {
  it('reads Mexican pesos and Spanish periods, and the highlighted plan', () => {
    const ex = run('spanish')
    expect(summary('spanish')).toEqual([
      'Básico 199 MXN 1month text',
      'Pro 349 MXN 1month text',
      'Despacho 1990 MXN 1year text',
    ])
    expect(ex.plans[ex.selected].label).toBe('Pro')
    expect(ex.name).toBe('Cuentas Claras')
    expect(ex.trial).toEqual({ freq: 30, range: 'day' })
  })

  it('reads euros written after the amount and the German periods', () => {
    const ex = run('german-eur')
    expect(summary('german-eur')).toEqual(['- 9.99 EUR 1month text', '- 99.9 EUR 1year text'])
    expect(ex.plans[ex.selected].billingRange).toBe('month')
    expect(ex.name).toBe('Lernwerk')
  })
})

describe('billed annually and "from" prices', () => {
  const ex = run('billed-annually')

  it('turns a monthly price billed annually into the yearly charge, and flags it', () => {
    const standard = ex.plans.find((p) => p.label === 'Standard')!
    expect(standard).toMatchObject({ amount: 96, currency: 'GBP', billingFreq: 1, billingRange: 'year', billedAnnually: true })
    expect(standard.confidence).toBe('low')
  })

  it('marks "from £5" as a lowest price', () => {
    const premium = ex.plans.find((p) => p.label === 'Premium')!
    expect(premium).toMatchObject({ amount: 5, billingRange: 'month', from: true })
  })

  it('preselects the cheapest monthly plan when none is highlighted', () => {
    expect(ex.plans[ex.selected].label).toBe('Premium')
    expect(ex.name).toBe('Teamboard')
  })
})

describe('one-time prices', () => {
  it('does not turn a lifetime deal into a monthly subscription', () => {
    const ex = run('lifetime')
    expect(summary('lifetime')).toEqual(['- 59 USD ? once text'])
    expect(ex.plans[0].billingRange).toBeNull()
    expect(suggestNextCharge(ex.plans[0], null, new Date(2026, 10, 2))).toBe('2026-11-02')
  })
})

describe('a page with no price', () => {
  const ex = run('no-price')

  it('keeps the fields it knows and leaves the rest empty', () => {
    expect(ex.plans).toEqual([])
    expect(ex.selected).toBe(-1)
    expect(ex.confidence).toBe('none')
    expect(ex.name).toBe('Example News')
    expect(ex.website).toBe('https://blog.example-news.org')
    expect(ex.logo).toBe('https://blog.example-news.org/favicon-32.png')
    expect(ex.trial).toBeNull()
  })
})

describe('helpers', () => {
  it('picks the cheapest monthly plan, else the cheapest per month', () => {
    const plan = (amount: number, range: 'month' | 'year' | null, extra = {}) =>
      ({ amount, billingFreq: range ? 1 : null, billingRange: range, oneTime: false, highlighted: false, ...extra }) as never
    expect(pickPlan([plan(20, 'month'), plan(5, 'month'), plan(100, 'year')])).toBe(1)
    expect(pickPlan([plan(120, 'year'), plan(15, 'year')])).toBe(1)
    expect(pickPlan([])).toBe(-1)
  })

  it('matches category hints to the person\'s categories', () => {
    const categories = ['Entertainment', 'Software', 'Business', 'Health & Fitness']
    expect(matchCategory('BusinessApplication', categories)).toBe('Business')
    expect(matchCategory('software', categories)).toBe('Software')
    expect(matchCategory('Games', categories)).toBe('')
    expect(matchCategory('', categories)).toBe('')
  })
})
