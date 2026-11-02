// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuth } from './auth'
import { CREDENTIAL_KEY, storage } from './storage'

const credential = { token: 'sbx_abcdefghijklmnop', expiresAt: '2027-01-31T10:00:00.000Z', user: { id: 'u1', email: 'sam@example.com' } }

beforeEach(async () => {
  localStorage.clear()
  await storage.remove(CREDENTIAL_KEY)
})

describe('auth', () => {
  it('is signed out without a stored token', async () => {
    const auth = createAuth()
    expect(await auth.getCredential()).toBeNull()
    expect(await auth.getToken()).toBeNull()
  })

  it('hands out the stored token and the user, never touching the network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await storage.set(CREDENTIAL_KEY, credential)
    const auth = createAuth()
    expect(await auth.getToken()).toBe(credential.token)
    expect((await auth.getCredential())?.user.email).toBe('sam@example.com')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('ignores anything stored that is not an extension token', async () => {
    await storage.set(CREDENTIAL_KEY, { accessToken: 'a', refreshToken: 'r' })
    expect(await createAuth().getToken()).toBeNull()
  })

  it('signs out by forgetting the token', async () => {
    await storage.set(CREDENTIAL_KEY, credential)
    const auth = createAuth()
    await auth.signOut()
    expect(await auth.getToken()).toBeNull()
  })
})
