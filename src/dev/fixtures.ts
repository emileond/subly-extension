import { collectPage } from '../extract/collect'
import type { PageSnapshot } from '../extract/types'

/** Fixture files start with `<!-- fixture-url: https://... -->` so the page knows where it "is" */
export function snapshotFromFixture(html: string): PageSnapshot {
  const url = /<!--\s*fixture-url:\s*(\S+)\s*-->/.exec(html)?.[1] ?? 'https://example.com/'
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return collectPage(doc, { href: url })
}

/**
 * Same, but in a real browser: the fixture is rendered in an off-screen iframe so collectPage sees laid-out text
 * (innerText), as it does on a live page, instead of the unrendered-document fallback.
 */
export function snapshotFromFixtureRendered(html: string): Promise<PageSnapshot> {
  const url = /<!--\s*fixture-url:\s*(\S+)\s*-->/.exec(html)?.[1] ?? 'https://example.com/'
  return new Promise((resolve) => {
    const frame = document.createElement('iframe')
    frame.setAttribute('aria-hidden', 'true')
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1024px;height:768px;border:0'
    frame.onload = () => {
      const snapshot = collectPage(frame.contentDocument as Document, { href: url })
      frame.remove()
      resolve(snapshot)
    }
    frame.srcdoc = html
    document.body.appendChild(frame)
  })
}
