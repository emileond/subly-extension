// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuth } from './auth'
import { SESSION_KEY, storage } from './storage'

const NOW = 10_000
const stored = (over = {}) => ({ accessToken: 'old', refreshToken: 'refresh-1', expiresAt: NOW + 3600, email: 'sam@example.com', ...over })

const auth = (fetchMock: typeof fetch) =>
  createAuth({ fetch: fetchMock, now: () => NOW, supabaseUrl: 'https://x.supabase.co', anonKey: 'anon' })

const refreshResponse = (status = 200) =>
  new Response(
    JSON.stringify({ access_token: 'new', refresh_token: 'refresh-2', expires_in: 3600, user: { email: 'sam@example.com' } }),
    { status }
  )

beforeEach(async () => {
  localStorage.clear()
  await storage.remove(SESSION_KEY)
})

describe('auth', () => {
  it('is signed out without a stored session', async () => {
    const fetchMock = vi.fn()
    expect(await auth(fetchMock as never).getAccessToken()).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('hands out the stored token while it is valid, without calling the network', async () => {
    await storage.set(SESSION_KEY, stored())
    const fetchMock = vi.fn()
    expect(await auth(fetchMock as never).getAccessToken()).toBe('old')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refreshes an ended token with the refresh token and stores the new pair', async () => {
    await storage.set(SESSION_KEY, stored({ expiresAt: NOW - 5 }))
    const fetchMock = vi.fn(async () => refreshResponse())
    const a = auth(fetchMock as never)
    expect(await a.getAccessToken()).toBe('new')

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://x.supabase.co/auth/v1/token?grant_type=refresh_token')
    expect(JSON.parse(init.body as string)).toEqual({ refresh_token: 'refresh-1' })
    expect(new Headers(init.headers).get('apikey')).toBe('anon')
    expect(await storage.get(SESSION_KEY)).toMatchObject({ accessToken: 'new', refreshToken: 'refresh-2', expiresAt: NOW + 3600, email: 'sam@example.com' })
  })

  it('shares one refresh between callers', async () => {
    await storage.set(SESSION_KEY, stored({ expiresAt: NOW - 5 }))
    const fetchMock = vi.fn(async () => refreshResponse())
    const a = auth(fetchMock as never)
    const tokens = await Promise.all([a.getAccessToken(), a.refresh(), a.getAccessToken()])
    expect(tokens).toEqual(['new', 'new', 'new'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('signs out when the refresh token is rejected', async () => {
    await storage.set(SESSION_KEY, stored({ expiresAt: NOW - 5 }))
    const a = auth((async () => new Response('{}', { status: 400 })) as never)
    expect(await a.getAccessToken()).toBeNull()
    expect(await storage.get(SESSION_KEY)).toBeUndefined()
  })

  it('stays signed in when Subly cannot be reached', async () => {
    await storage.set(SESSION_KEY, stored({ expiresAt: NOW - 5 }))
    const a = auth((async () => { throw new TypeError('offline') }) as never)
    await expect(a.getAccessToken()).rejects.toThrow(/reach Subly/)
    expect(await storage.get(SESSION_KEY)).toBeDefined()
  })

  it('signs out by forgetting the session', async () => {
    await storage.set(SESSION_KEY, stored())
    const a = auth(vi.fn() as never)
    await a.signOut()
    expect(await a.getSession()).toBeNull()
  })
})
