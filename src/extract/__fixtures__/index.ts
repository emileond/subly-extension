import { snapshotFromFixture } from '../../dev/fixtures'
import type { PageSnapshot } from '../types'

const files = import.meta.glob<string>('./*.html', { query: '?raw', import: 'default', eager: true })

/** The saved page `name` (a file in this folder without .html), read as the content script would */
export function fixtureSnapshot(name: string): PageSnapshot {
  const html = files[`./${name}.html`]
  if (!html) throw new Error(`No fixture named ${name}`)
  return snapshotFromFixture(html)
}
