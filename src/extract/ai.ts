import { findMoney } from './price'
import type { PageSnapshot } from './types'

export const MAX_AI_TEXT = 6000

export interface ParseRequest {
  url: string
  title: string
  siteName?: string
  description?: string
  jsonLd?: unknown[]
  metas?: Record<string, string>
  text?: string
  workspaceId?: number
}

const PLAN_WORDS = /\b(?:plans?|pricing|prices?|per (?:month|year|user|seat)|monthly|yearly|annual(?:ly)?|billed|subscribe|subscription|trial|\/(?:mo|month|yr|year)|planes?|precios?|tarifs?|preise)\b/i

/** At most `limit` characters of the page text: the lines around prices and plan words, else the start of the page */
export function pickText(text: string, hints: { lang: string; host: string }, limit = MAX_AI_TEXT): string {
  if (text.length <= limit) return text
  const lines = text.split('\n')
  const keep = new Set<number>()
  lines.forEach((line, i) => {
    if (findMoney(line, hints).length > 0 || PLAN_WORDS.test(line)) {
      for (let j = Math.max(0, i - 1); j <= Math.min(lines.length - 1, i + 1); j++) keep.add(j)
    }
  })
  const picked: string[] = []
  let size = 0
  const order = keep.size > 0 ? [...keep].sort((a, b) => a - b) : lines.map((_, i) => i)
  for (const i of order) {
    const line = lines[i]
    if (size + line.length + 1 > limit) break
    picked.push(line)
    size += line.length + 1
  }
  return picked.join('\n')
}

/** What is sent to the server's parse route: the address without its query or fragment, and only the page parts listed here */
export function buildParseRequest(snap: PageSnapshot, workspaceId?: number): ParseRequest {
  let url = snap.url
  try {
    const parsed = new URL(snap.url)
    url = `${parsed.origin}${parsed.pathname}`
  } catch {
    /* keep the address as it is */
  }
  let host = ''
  try {
    host = new URL(snap.url).hostname
  } catch {
    /* no host */
  }

  const request: ParseRequest = { url, title: snap.title }
  const siteName = snap.metas['og:site_name']
  const description = snap.metas['og:description'] ?? snap.metas['description']
  if (siteName) request.siteName = siteName
  if (description) request.description = description
  if (snap.jsonLd.length) request.jsonLd = snap.jsonLd.slice(0, 30)
  if (Object.keys(snap.metas).length) request.metas = snap.metas
  const text = pickText(snap.text, { lang: snap.lang, host })
  if (text) request.text = text
  if (workspaceId) request.workspaceId = workspaceId
  return request
}
