import { describe, expect, it } from 'vitest'
import { isExpiring, normalizeSession } from './session'

const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
const jwt = (claims: object) => `${b64({ alg: 'HS256' })}.${b64(claims)}.sig`

describe('normalizeSession', () => {
  it('keeps only the tokens, the expiry and the email of a Supabase session', () => {
    const session = normalizeSession({
      access_token: 'a', refresh_token: 'r', expires_at: 2000, expires_in: 3600, token_type: 'bearer',
      provider_token: 'google-secret', user: { id: 'u', email: 'sam@example.com', app_metadata: { x: 1 } },
    })
    expect(session).toEqual({ accessToken: 'a', refreshToken: 'r', expiresAt: 2000, email: 'sam@example.com' })
  })

  it('reads the expiry and the email from the access token when the session lacks them', () => {
    const token = jwt({ exp: 5000, email: 'lee@example.com' })
    expect(normalizeSession({ access_token: token, refresh_token: 'r' })).toMatchObject({ expiresAt: 5000, email: 'lee@example.com' })
  })

  it('falls back to expires_in, then to an hour from now', () => {
    expect(normalizeSession({ access_token: 'a', refresh_token: 'r', expires_in: 100 }, 1000)?.expiresAt).toBe(1100)
    expect(normalizeSession({ access_token: 'a', refresh_token: 'r' }, 1000)?.expiresAt).toBe(4600)
  })

  it('accepts its own stored shape', () => {
    const stored = { accessToken: 'a', refreshToken: 'r', expiresAt: 10, email: null }
    expect(normalizeSession(stored)).toEqual(stored)
  })

  it.each([null, undefined, 'x', 1, {}, { access_token: 'a' }, { refresh_token: 'r' }, { access_token: 1, refresh_token: 2 }])(
    'rejects %j',
    (input) => {
      expect(normalizeSession(input)).toBeNull()
    }
  )
})

describe('isExpiring', () => {
  const session = { accessToken: 'a', refreshToken: 'r', expiresAt: 1000, email: null }
  it('is true within the margin of the end', () => {
    expect(isExpiring(session, 60, 900)).toBe(false)
    expect(isExpiring(session, 60, 950)).toBe(true)
    expect(isExpiring(session, 60, 2000)).toBe(true)
  })
})
