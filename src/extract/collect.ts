import type { MicrodataOffer, PageIcon, PageSnapshot } from './types'

/**
 * Runs inside the page (chrome.scripting.executeScript serializes this one function), so it must not use anything
 * outside its own body: no imports, helpers or module constants. The defaults let tests pass a parsed document.
 */
export function collectPage(
  doc: Document = document,
  loc: { href: string } = location
): PageSnapshot {
  const clip = (s: string | null | undefined, n: number) =>
    (s || '').replace(/\s+/g, ' ').trim().slice(0, n)
  const abs = (href: string | null | undefined) => {
    try {
      return href ? new URL(href, loc.href).href : ''
    } catch {
      return ''
    }
  }

  const metas: Record<string, string> = {}
  const useful =
    /^(og:|twitter:|product:|description$|keywords$|application-name$|apple-mobile-web-app-title$|title$|itemprop:|price|currency)/
  let metaCount = 0
  doc.querySelectorAll('meta').forEach((meta) => {
    const key = (
      meta.getAttribute('property') ||
      meta.getAttribute('name') ||
      (meta.getAttribute('itemprop') ? 'itemprop:' + meta.getAttribute('itemprop') : '')
    ).toLowerCase()
    const content = meta.getAttribute('content')
    if (key && content && useful.test(key) && !(key in metas) && metaCount < 80) {
      metas[key] = clip(content, 500)
      metaCount++
    }
  })

  const jsonLd: unknown[] = []
  doc.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
    const raw = script.textContent || ''
    if (raw.length > 150000 || jsonLd.length >= 12) return
    try {
      jsonLd.push(JSON.parse(raw))
    } catch {
      /* invalid JSON-LD is common; skip it */
    }
  })

  const offers: MicrodataOffer[] = []
  const prop = (scope: Element, name: string) => {
    const el = scope.querySelector('[itemprop="' + name + '"]')
    return el ? clip(el.getAttribute('content') || el.getAttribute('value') || el.textContent, 80) : ''
  }
  doc
    .querySelectorAll('[itemtype*="schema.org/Offer"], [itemtype*="schema.org/AggregateOffer"]')
    .forEach((scope) => {
      if (offers.length >= 20) return
      const offer = {
        name: prop(scope, 'name'),
        price: prop(scope, 'price'),
        lowPrice: prop(scope, 'lowPrice'),
        priceCurrency: prop(scope, 'priceCurrency'),
      }
      if (offer.price || offer.lowPrice) offers.push(offer)
    })

  const icons: PageIcon[] = []
  doc
    .querySelectorAll(
      'link[rel~="icon"], link[rel="shortcut icon"], link[rel^="apple-touch-icon"]'
    )
    .forEach((link) => {
      const href = abs(link.getAttribute('href'))
      if (href && icons.length < 12) {
        icons.push({
          href,
          rel: (link.getAttribute('rel') || '').toLowerCase(),
          sizes: link.getAttribute('sizes') || '',
        })
      }
    })

  // innerText respects CSS (hidden and collapsed content is left out); other DOMs (tests) get a plain walk
  const body = doc.body
  let lines: string[] = []
  if (body && typeof body.innerText === 'string') {
    lines = body.innerText.split('\n')
  } else if (body) {
    const skip = /^(script|style|noscript|template|svg|head|iframe)$/i
    const block =
      /^(address|article|aside|blockquote|br|dd|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tr|ul|button|label|option)$/i
    let current = ''
    const flush = () => {
      lines.push(current)
      current = ''
    }
    const visit = (node: Node) => {
      if (node.nodeType === 3) {
        current += ' ' + (node.textContent || '')
        return
      }
      if (node.nodeType !== 1) return
      const el = node as HTMLElement
      if (skip.test(el.tagName) || el.hidden || /display:\s*none/i.test(el.getAttribute('style') || '')) return
      const isBlock = block.test(el.tagName)
      if (isBlock) flush()
      el.childNodes.forEach(visit)
      if (isBlock) flush()
    }
    visit(body)
    flush()
  }
  lines = lines.map((l) => clip(l, 300)).filter(Boolean)

  // Long pages: keep the start, then the lines around anything that looks like a price
  let text = lines.join('\n')
  const CAP = 40000
  if (text.length > CAP) {
    const money = /[$€£¥₹₩₽₺₪₫₱฿]|\b(USD|EUR|GBP|CAD|AUD|CHF|JPY|MXN|BRL|INR)\b|\d\s?(zł|kr|Kč)/
    const keep = new Set<number>()
    let size = 0
    for (let i = 0; i < lines.length && size < 6000; i++) {
      keep.add(i)
      size += lines[i].length + 1
    }
    for (let i = 0; i < lines.length && size < CAP; i++) {
      if (!money.test(lines[i])) continue
      for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 3); j++) {
        if (!keep.has(j)) {
          keep.add(j)
          size += lines[j].length + 1
        }
      }
    }
    text = lines.filter((_, i) => keep.has(i)).join('\n').slice(0, CAP)
  }

  const canonical = doc.querySelector('link[rel="canonical"]')
  return {
    url: loc.href,
    canonicalUrl: abs(canonical && canonical.getAttribute('href')) || abs(metas['og:url']) || null,
    title: clip(doc.title, 300),
    lang: (doc.documentElement.getAttribute('lang') || metas['og:locale'] || '').trim(),
    metas,
    jsonLd,
    offers,
    icons,
    text,
  }
}
