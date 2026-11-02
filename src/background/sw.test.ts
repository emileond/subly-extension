import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Listener = (message: unknown, sender: Record<string, unknown>, respond: (r: unknown) => void) => boolean | void

const payload = { token: 'sbx_abcdefghijklmnop', expiresAt: '2027-01-31T10:00:00.000Z', user: { id: 'u1', email: 'sam@example.com' } }

async function load() {
  const listeners = { external: null as Listener | null, internal: null as Listener | null, installed: null as (() => void) | null }
  const store: Record<string, unknown> = {}
  const remove = vi.fn(async () => {})
  vi.stubGlobal('chrome', {
    runtime: {
      id: 'self',
      onMessage: { addListener: (l: Listener) => (listeners.internal = l) },
      onMessageExternal: { addListener: (l: Listener) => (listeners.external = l) },
      onInstalled: { addListener: (l: () => void) => (listeners.installed = l) },
    },
    storage: { local: { set: vi.fn(async (items: Record<string, unknown>) => void Object.assign(store, items)), remove } },
    tabs: { query: vi.fn(async () => []), create: vi.fn(async () => ({})), update: vi.fn() },
    windows: { update: vi.fn() },
  })
  vi.resetModules()
  await import('./sw')
  return { listeners, store, remove }
}

const send = (listener: Listener, message: unknown, sender: Record<string, unknown>) =>
  new Promise<unknown>((resolve) => {
    const keepOpen = listener(message, sender, resolve)
    if (!keepOpen) queueMicrotask(() => resolve('no-response'))
  })

const fromSubly = { origin: 'https://web.subly.app' }

beforeEach(() => vi.spyOn(console, 'log').mockImplementation(() => {}))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('service worker: SET_EXTENSION_TOKEN', () => {
  it('stores the token, its expiry and the user from the Subly origin, and answers ok', async () => {
    const { listeners, store } = await load()
    const answer = await send(listeners.external!, { type: 'SET_EXTENSION_TOKEN', payload }, fromSubly)
    expect(answer).toEqual({ ok: true })
    expect(store.extensionToken).toEqual(payload)
  })

  it('keeps nothing but the token, expiry and user', async () => {
    const { listeners, store } = await load()
    await send(listeners.external!, { type: 'SET_EXTENSION_TOKEN', payload: { ...payload, session: { refresh_token: 'r' }, extra: 1 } }, fromSubly)
    expect(Object.keys(store.extensionToken as object).sort()).toEqual(['expiresAt', 'token', 'user'])
  })

  it('refuses a message from another origin', async () => {
    const { listeners, store } = await load()
    for (const origin of ['https://evil.example', 'https://web.subly.app.evil.example', 'http://web.subly.app', undefined]) {
      expect(await send(listeners.external!, { type: 'SET_EXTENSION_TOKEN', payload }, { origin })).toEqual({ ok: false })
    }
    expect(store.extensionToken).toBeUndefined()
  })

  it('refuses a payload that is not an extension token, including the old Supabase session', async () => {
    const { listeners, store } = await load()
    expect(await send(listeners.external!, { type: 'SET_EXTENSION_TOKEN', payload: { token: 'nope' } }, fromSubly)).toEqual({ ok: false })
    expect(await send(listeners.external!, { type: 'SET_SESSION', payload: { session: { access_token: 'a', refresh_token: 'r' } } }, fromSubly)).toBe('no-response')
    expect(store.extensionToken).toBeUndefined()
  })

  it('answers ok: false when storing fails, so the web page signs the token out', async () => {
    const { listeners } = await load()
    ;(chrome.storage.local.set as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('quota'))
    expect(await send(listeners.external!, { type: 'SET_EXTENSION_TOKEN', payload }, fromSubly)).toEqual({ ok: false })
  })

  it('never logs the token', async () => {
    const spies = [vi.spyOn(console, 'log'), vi.spyOn(console, 'info'), vi.spyOn(console, 'warn'), vi.spyOn(console, 'error')]
    const { listeners } = await load()
    await send(listeners.external!, { type: 'SET_EXTENSION_TOKEN', payload }, fromSubly)
    expect(spies.flatMap((s) => s.mock.calls).flat().join(' ')).not.toContain('sbx_')
  })
})

describe('service worker: the rest', () => {
  it('only opens the sign-in tab for the extension\'s own pages', async () => {
    const { listeners } = await load()
    expect(await send(listeners.internal!, { type: 'OPEN_LOGIN' }, { id: 'someone-else' })).toBe('no-response')
    expect(chrome.tabs.create).not.toHaveBeenCalled()
    expect(await send(listeners.internal!, { type: 'OPEN_LOGIN' }, { id: 'self' })).toEqual({ ok: true })
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://web.subly.app/chrome-extension-login', active: true })
  })

  it('forgets a version 0.0.x session on install and update', async () => {
    const { listeners, remove } = await load()
    listeners.installed!()
    expect(remove).toHaveBeenCalledWith(['sessionData', 'session'])
  })
})
