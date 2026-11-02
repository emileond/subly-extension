// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { fixtureSnapshot } from './__fixtures__'
import { collectPage } from './collect'

const fixture = (name: string) =>
  fixtureSnapshot(name)

describe('collectPage', () => {
  it('reads metas, JSON-LD, icons and text', () => {
    const snap = fixture('jsonld-offers')
    expect(snap.url).toBe('https://www.paperly.com/pricing')
    expect(snap.canonicalUrl).toBe('https://www.paperly.com/pricing')
    expect(snap.lang).toBe('en')
    expect(snap.title).toBe('Pricing | Paperly')
    expect(snap.metas['og:site_name']).toBe('Paperly')
    expect(snap.jsonLd).toHaveLength(1)
    expect(snap.icons.map((i) => i.href)).toContain('https://www.paperly.com/icons/apple-touch-icon.png')
    expect(snap.text).toContain('$10 per member / month')
    expect(snap.text.split('\n')).toContain('Most popular')
  })

  it('keeps only useful metas and skips unreadable JSON-LD', () => {
    const doc = new DOMParser().parseFromString(
      `<head><meta name="csrf-token" content="secret"><meta name="viewport" content="x"><meta property="og:title" content="T">
       <script type="application/ld+json">{ not json</script></head><body>hi</body>`,
      'text/html'
    )
    const snap = collectPage(doc, { href: 'https://a.com/' })
    expect(snap.metas).toEqual({ 'og:title': 'T' })
    expect(snap.jsonLd).toEqual([])
  })

  it('leaves out script, style and hidden text', () => {
    const doc = new DOMParser().parseFromString(
      `<body><p>Visible $9</p><script>var secret = 1</script><style>.a{}</style><div hidden>Hidden $99</div><div style="display:none">Gone $98</div></body>`,
      'text/html'
    )
    expect(collectPage(doc, { href: 'https://a.com/' }).text).toBe('Visible $9')
  })

  it('reads microdata offers', () => {
    const doc = new DOMParser().parseFromString(
      `<body><div itemscope itemtype="https://schema.org/Offer"><span itemprop="name">Pro</span><meta itemprop="price" content="12.00"><meta itemprop="priceCurrency" content="USD"></div></body>`,
      'text/html'
    )
    expect(collectPage(doc, { href: 'https://a.com/' }).offers).toEqual([
      { name: 'Pro', price: '12.00', lowPrice: '', priceCurrency: 'USD' },
    ])
  })

  it('is one self-contained function, so executeScript can run it in a page', () => {
    // executeScript sends only the function's source; this evaluates that source with nothing else in scope
    const doc = new DOMParser().parseFromString('<title>T</title><body>Pro $5/mo</body>', 'text/html')
    const standalone = new Function(`return (${collectPage.toString()})`)()
    const snap = standalone(doc, { href: 'https://a.com/' })
    expect(snap.text).toBe('Pro $5/mo')
    expect(snap.title).toBe('T')
  })

  it('caps long pages but keeps the lines around prices', () => {
    const filler = Array.from({ length: 3000 }, (_, i) => `<p>Filler paragraph number ${i} with some words</p>`).join('')
    const doc = new DOMParser().parseFromString(`<body>${filler}<p>Pro plan</p><p>$42 / month</p></body>`, 'text/html')
    const text = collectPage(doc, { href: 'https://a.com/' }).text
    expect(text.length).toBeLessThanOrEqual(40000)
    expect(text).toContain('$42 / month')
  })
})
