const SEPARATORS = /\s+[|\-–—·•:~»«]\s+|\s*[|·•»«]\s*/

/** Words that describe the page, not the service: "Pricing", "Plans & Pricing", "Precios" */
const GENERIC = new Set([
  'pricing', 'plans', 'plan', 'prices', 'price', 'tarifs', 'tarif', 'precios', 'precio', 'planes', 'preise', 'preis',
  'pläne', 'prezzi', 'piani', 'preços', 'planos', 'prijzen', 'abonnement', 'abonnements', 'subscription',
  'subscriptions', 'suscripción', 'suscripciones', 'subscribe', 'buy', 'upgrade', 'checkout', 'cart', 'home',
  'homepage', 'welcome', 'inicio', 'accueil', 'startseite', 'official', 'site', 'website', 'page', 'web',
  'compare', 'choose', 'your', 'the', 'our', 'get', 'started', 'sign', 'up', 'in', 'log', 'login', 'signup',
  'free', 'trial', 'premium', 'membership',
])
/** Connectors that may remain at the edges once the generic words are gone */
const EDGE = new Set(['&', 'and', 'y', 'et', 'und', 'e', 'en', '-', '–', '—', 'for', 'to', 'de', 'del', 'a'])

function stripEdges(segment: string): string {
  const tokens = segment.split(/\s+/).filter(Boolean)
  const isGeneric = (t: string) => GENERIC.has(t.toLowerCase().replace(/[.,!:;]+$/, '')) || EDGE.has(t.toLowerCase())
  while (tokens.length > 1 && isGeneric(tokens[0])) tokens.shift()
  while (tokens.length > 1 && isGeneric(tokens[tokens.length - 1])) tokens.pop()
  return tokens.join(' ').replace(/^[\s\-–—:|·•]+|[\s\-–—:|·•]+$/g, '')
}

/** True for a segment that says nothing about who the service is ("Pricing", "Plans & Pricing", "Home") */
export function isGenericName(segment: string): boolean {
  const tokens = segment.split(/\s+/).filter(Boolean)
  return (
    tokens.length === 0 ||
    tokens.every((t) => GENERIC.has(t.toLowerCase().replace(/[.,!:;]+$/, '')) || EDGE.has(t.toLowerCase()))
  )
}

const alnum = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')

const SECOND_LEVEL = new Set(['co', 'com', 'org', 'net', 'gov', 'edu', 'ac', 'or', 'ne', 'go'])

/** "app.notion.so" -> "notion", "www.bbc.co.uk" -> "bbc" */
export function brandLabel(host: string): string {
  const labels = host.toLowerCase().replace(/^www\./, '').split('.').filter(Boolean)
  if (labels.length === 0) return ''
  if (labels.length === 1) return labels[0]
  const tld = labels[labels.length - 1]
  const second = labels[labels.length - 2]
  if (labels.length >= 3 && tld.length === 2 && SECOND_LEVEL.has(second)) return labels[labels.length - 3]
  return second
}

/** "notion" -> "Notion", "my-service" -> "My Service" */
export function brandFromHost(host: string): string {
  const label = brandLabel(host)
  if (!label || /^\d+$/.test(label)) return ''
  return label
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Splits "Pricing | Notion" or "Notion – The all-in-one workspace" and drops the generic pieces */
export function titleSegments(title: string): string[] {
  return title
    .split(SEPARATORS)
    .map((s) => stripEdges(s.trim()))
    .filter((s) => s && !isGenericName(s))
}

/** The segment that is the brand of `host`, if one is */
export function segmentMatchingHost(segments: string[], host: string): string {
  const brand = alnum(brandLabel(host))
  if (!brand) return ''
  const matches = segments.filter((s) => {
    const key = alnum(s)
    return key.length >= 2 && (key.includes(brand) || (key.length >= 4 && brand.includes(key)))
  })
  return matches.sort((a, b) => a.length - b.length)[0] ?? ''
}

/** A name from a field that should hold a brand (og:site_name, Organization.name): cleaned, or '' when it is not one */
export function cleanBrand(raw: string | undefined, host: string): string {
  const value = (raw ?? '').replace(/\s+/g, ' ').trim()
  if (!value || value.length > 60) return ''
  const segments = titleSegments(value)
  if (segments.length === 0) return ''
  return segmentMatchingHost(segments, host) || segments[0]
}
