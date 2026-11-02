import { describe, expect, it } from 'vitest'
import { expiresSoon, isExpired, normalizeCredential } from './credential'

const payload = { token: 'sbx_abcdefghijklmnop', expiresAt: '2027-01-31T10:00:00.000Z', user: { id: 'u1', email: 'sam@example.com' } }

describe('normalizeCredential', () => {
  it('keeps only the token, its expiry and the user', () => {
    expect(normalizeCredential({ ...payload, session: { access_token: 'x' }, extra: 1, user: { ...payload.user, role: 'admin' } })).toEqual(payload)
  })

  it.each([
    ['null', null],
    ['a string', 'sbx_abcdefghijklmnop'],
    ['no token', { ...payload, token: '' }],
    ['not an extension token', { ...payload, token: 'eyJhbGciOiJIUzI1NiJ9.abc.def' }],
    ['a Supabase session', { session: { access_token: 'a', refresh_token: 'r' } }],
    ['no expiry', { ...payload, expiresAt: '' }],
    ['a bad expiry', { ...payload, expiresAt: 'soon' }],
    ['no user', { ...payload, user: undefined }],
    ['no email', { ...payload, user: { id: 'u1' } }],
  ])('rejects %s', (_, input) => {
    expect(normalizeCredential(input)).toBeNull()
  })
})

describe('expiry', () => {
  const at = (iso: string) => ({ ...payload, expiresAt: iso })
  const now = Date.parse('2027-01-01T00:00:00Z')

  it('knows when the 90 days are over', () => {
    expect(isExpired(at('2026-12-31T00:00:00Z'), now)).toBe(true)
    expect(isExpired(at('2027-02-01T00:00:00Z'), now)).toBe(false)
  })

  it('warns only in the last 7 days', () => {
    expect(expiresSoon(at('2027-01-05T00:00:00Z'), now)).toBe(true)
    expect(expiresSoon(at('2027-01-20T00:00:00Z'), now)).toBe(false)
    expect(expiresSoon(at('2026-12-31T00:00:00Z'), now)).toBe(false)
  })
})
