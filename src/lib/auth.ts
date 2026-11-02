import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config'
import { isExpiring, normalizeSession, type Session } from './session'
import { SESSION_KEY, storage } from './storage'

export interface Auth {
  /** The stored session, or null when signed out */
  getSession(): Promise<Session | null>
  /** A usable access token, refreshed first when it has ended; null when signed out */
  getAccessToken(): Promise<string | null>
  /** Gets a new access token with the refresh token (after a 401); null when that no longer works */
  refresh(): Promise<string | null>
  signOut(): Promise<void>
}

export class AuthNetworkError extends Error {}

interface AuthDeps {
  fetch?: typeof fetch
  now?: () => number
  supabaseUrl?: string
  anonKey?: string
}

/**
 * Keeps the session the web sign-in page handed over alive. Refresh tokens are one-use, so only one refresh runs at a
 * time, and a refresh token that Supabase rejects means this browser is signed out.
 */
export function createAuth(deps: AuthDeps = {}): Auth {
  const doFetch = deps.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  const now = deps.now ?? (() => Date.now() / 1000)
  const url = deps.supabaseUrl ?? SUPABASE_URL
  const anonKey = deps.anonKey ?? SUPABASE_ANON_KEY
  let inFlight: Promise<Session | null> | null = null

  const load = async () => normalizeSession(await storage.get(SESSION_KEY), now())

  async function exchange(session: Session): Promise<Session | null> {
    let response: Response
    try {
      response = await doFetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: session.refreshToken }),
      })
    } catch {
      throw new AuthNetworkError('Could not reach Subly to renew your session.')
    }
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      // The refresh token was revoked, already used or expired: this browser is signed out
      await storage.remove(SESSION_KEY)
      return null
    }
    if (!response.ok) throw new AuthNetworkError('Subly could not renew your session. Try again in a moment.')

    const next = normalizeSession(await response.json().catch(() => null), now())
    if (!next) throw new AuthNetworkError('Subly sent an unexpected answer. Try again in a moment.')
    const renewed = { ...next, email: next.email ?? session.email }
    await storage.set(SESSION_KEY, renewed)
    return renewed
  }

  function renew(): Promise<Session | null> {
    // One refresh at a time: two in flight would spend the same one-use refresh token twice
    inFlight ??= load()
      .then((session) => (session ? exchange(session) : null))
      .finally(() => {
        inFlight = null
      })
    return inFlight
  }

  return {
    getSession: load,
    async getAccessToken() {
      const session = await load()
      if (!session) return null
      if (!isExpiring(session, 60, now())) return session.accessToken
      return (await renew())?.accessToken ?? null
    },
    async refresh() {
      return (await renew())?.accessToken ?? null
    },
    async signOut() {
      await storage.remove(SESSION_KEY)
    },
  }
}
