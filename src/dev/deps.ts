import { createApiClient } from '../api/client'
import { MOCK_TOKEN, createMockFetch } from '../api/mock'
import { BASE_URL } from '../config'
import type { Deps } from '../deps'
import { createAuth } from '../lib/auth'
import { CREDENTIAL_KEY, storage } from '../lib/storage'
import { snapshotFromFixtureRendered } from './fixtures'

const fixtures = import.meta.glob<string>('../extract/__fixtures__/*.html', { query: '?raw', import: 'default' })

export const FIXTURE_NAMES = Object.keys(fixtures).map((path) => path.replace(/^.*\/(.*)\.html$/, '$1'))

const mockCredential = (expiresInDays = 90) => ({
  token: MOCK_TOKEN,
  expiresAt: new Date(Date.now() + expiresInDays * 86_400_000).toISOString(),
  user: { id: 'user-1', email: 'sam@example.com' },
})

/**
 * The popup in a normal browser tab (npm run dev): the mock server answers, and the "open tab" is a saved page.
 * ?page=<fixture name> picks the page (or none), ?signedout=1 starts signed out, ?limit=1 puts the account at its plan limit,
 * ?expiring=1 makes the token end in 3 days.
 */
export async function createDevDeps(): Promise<Deps> {
  const params = new URLSearchParams(location.search)
  if (params.get('signedout') === '1') await storage.remove(CREDENTIAL_KEY)
  else if (params.get('expiring') === '1') await storage.set(CREDENTIAL_KEY, mockCredential(3))
  else if (!(await storage.get(CREDENTIAL_KEY))) await storage.set(CREDENTIAL_KEY, mockCredential())

  const auth = createAuth()
  const mock = createMockFetch({ delay: 350, atLimit: params.get('limit') === '1' })
  const pageName = params.get('page') ?? 'jsonld-offers'

  return {
    auth,
    api: createApiClient({
      baseUrl: BASE_URL,
      getToken: auth.getToken,
      onSignedOut: () => void auth.signOut(),
      fetch: mock as unknown as typeof fetch,
    }),
    readPage: async () => {
      const load = fixtures[`../extract/__fixtures__/${pageName}.html`]
      if (!load) return { status: 'unreadable', reason: 'restricted' }
      return { status: 'ok', snapshot: await snapshotFromFixtureRendered(await load()) }
    },
    openLogin: async () => {
      // Stands in for the web sign-in page handing the token over
      await storage.set(CREDENTIAL_KEY, mockCredential())
      location.reload()
    },
    baseUrl: BASE_URL,
  }
}
