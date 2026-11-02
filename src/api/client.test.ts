import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from './client'
import { MOCK_TOKEN, createMockFetch } from './mock'
import { ApiError } from './types'

function client(overrides: Partial<Parameters<typeof createApiClient>[0]> = {}, mock = createMockFetch()) {
  const onSignedOut = vi.fn()
  const api = createApiClient({
    baseUrl: 'https://web.subly.app',
    getToken: async () => MOCK_TOKEN,
    refreshToken: async () => null,
    onSignedOut,
    fetch: mock as unknown as typeof fetch,
    ...overrides,
  })
  return { api, onSignedOut, mock }
}

const item = { name: 'Paperly', amount: 10, currency: 'USD' }

describe('api client', () => {
  it('sends the bearer token to the right URL and reads the context', async () => {
    const mock = vi.fn(createMockFetch())
    const { api } = client({}, mock as never)
    const ctx = await api.getContext(2)
    expect(ctx.workspace).toMatchObject({ id: 2, baseCurrency: 'EUR' })
    expect(ctx.projects).toEqual([{ id: 21, name: 'Client work', isDefault: true }])
    const [url, init] = mock.mock.calls[0]
    expect(String(url)).toBe('https://web.subly.app/api/extension/context?workspace_id=2')
    expect(new Headers((init as RequestInit).headers).get('Authorization')).toBe(`Bearer ${MOCK_TOKEN}`)
  })

  it('creates an item and returns its link', async () => {
    const { api } = client()
    const result = await api.addItem({ workspaceId: 1, item })
    expect(result).toMatchObject({ kind: 'created' })
    expect(result.kind === 'created' && result.url).toContain('/recurring/')
  })

  it('answers a 409 as a duplicate, not an error, and force adds it anyway', async () => {
    const { api } = client()
    const dup = await api.addItem({ workspaceId: 1, item: { ...item, name: 'Netflix' } })
    expect(dup).toEqual({ kind: 'duplicate', duplicateOf: { id: 7, name: 'Netflix' } })
    const forced = await api.addItem({ workspaceId: 1, force: true, item: { ...item, name: 'Netflix' } })
    expect(forced.kind).toBe('created')
  })

  it('turns plan limits, allowance, validation and server errors into typed errors with the server\'s words', async () => {
    const { api } = client()
    await expect(api.addItem({ workspaceId: 1, item: { ...item, name: 'Limit' } })).rejects.toMatchObject({
      code: 'limit',
      message: 'Your Free plan includes 10 items. Upgrade to add more.',
    })
    await expect(api.addItem({ workspaceId: 1, item: { ...item, name: '' } })).rejects.toMatchObject({ code: 'validation' })

    const small = createMockFetch({ aiAllowance: 0 })
    await expect(client({}, small).api.parse({ url: 'https://a.com/', title: 'A' })).rejects.toMatchObject({ code: 'allowance', status: 429 })
  })

  it('also reads an error written as a plain string', async () => {
    const fetchMock = async () => new Response(JSON.stringify({ error: 'Upgrade your plan' }), { status: 402 })
    const { api } = client({ fetch: fetchMock as never })
    await expect(api.addItem({ workspaceId: 1, item })).rejects.toMatchObject({ code: 'limit', message: 'Upgrade your plan' })
  })

  it('signs out on a 401 that a refresh does not fix', async () => {
    const { api, onSignedOut } = client({ getToken: async () => 'stale', refreshToken: async () => null })
    await expect(api.getContext()).rejects.toMatchObject({ code: 'unauthorized' })
    expect(onSignedOut).toHaveBeenCalledOnce()
  })

  it('renews the token once after a 401 and retries', async () => {
    const refreshToken = vi.fn(async () => MOCK_TOKEN)
    const { api, onSignedOut } = client({ getToken: async () => 'stale', refreshToken })
    await expect(api.getContext()).resolves.toMatchObject({ workspace: { id: 1 } })
    expect(refreshToken).toHaveBeenCalledOnce()
    expect(onSignedOut).not.toHaveBeenCalled()
  })

  it('treats a missing token as signed out', async () => {
    const { api, onSignedOut } = client({ getToken: async () => null })
    await expect(api.getContext()).rejects.toBeInstanceOf(ApiError)
    expect(onSignedOut).toHaveBeenCalledOnce()
  })

  it('reports a network failure in plain words', async () => {
    const { api } = client({ fetch: (async () => { throw new TypeError('Failed to fetch') }) as never })
    await expect(api.getContext()).rejects.toMatchObject({ code: 'network' })
  })

  it('fills in lists the server left out of the context', async () => {
    const fetchMock = async () => new Response(JSON.stringify({ workspace: { id: 5, name: 'W', baseCurrency: 'GBP', locale: 'en' } }), { status: 200 })
    const { api } = client({ fetch: fetchMock as never })
    const ctx = await api.getContext()
    expect(ctx).toMatchObject({ projects: [], categories: [], tags: [], paymentMethods: [], canAdd: true, workspaces: [{ id: 5, name: 'W' }] })
  })
})
