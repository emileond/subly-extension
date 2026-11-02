import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from './client'
import { MOCK_TOKEN, createMockFetch } from './mock'
import { ApiError } from './types'

function client(overrides: Partial<Parameters<typeof createApiClient>[0]> = {}, mock = createMockFetch()) {
  const onSignedOut = vi.fn()
  const api = createApiClient({
    baseUrl: 'https://web.subly.app',
    getToken: async () => MOCK_TOKEN,
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

  it.each([
    ['sbx_other', 'invalid_token', /signed out of the extension|another browser/],
    ['sbx_expired', 'token_expired', /90 days/],
    ['sbx_mfa', 'mfa_required', /two-factor/i],
  ])('a 401 with %s means sign in again, with the reason for %s', async (token, serverCode, words) => {
    const mock = vi.fn(createMockFetch())
    const { api, onSignedOut } = client({ getToken: async () => token }, mock as never)
    await expect(api.getContext()).rejects.toMatchObject({ code: 'unauthorized', status: 401, serverCode, message: expect.stringMatching(words) })
    expect(onSignedOut).toHaveBeenCalledOnce()
    // No renewing and no retry
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('a 401 for a missing header is a plain sign-in message', async () => {
    const fetchMock = async () => new Response(JSON.stringify({ error: { code: 'unauthorized', message: 'x' } }), { status: 401 })
    const { api, onSignedOut } = client({ fetch: fetchMock as never })
    await expect(api.getContext()).rejects.toMatchObject({ code: 'unauthorized', serverCode: 'unauthorized' })
    expect(onSignedOut).toHaveBeenCalledOnce()
  })

  it('a 403 points to the website to finish setting up', async () => {
    const fetchMock = async () => new Response(JSON.stringify({ error: { code: 'forbidden', message: 'no workspace' } }), { status: 403 })
    const { api, onSignedOut } = client({ fetch: fetchMock as never })
    await expect(api.getContext()).rejects.toMatchObject({ code: 'forbidden', message: expect.stringContaining('web.subly.app') })
    expect(onSignedOut).not.toHaveBeenCalled()
  })

  it('keeps the suggestion the server sends with a spent AI allowance', async () => {
    const { api } = client({}, createMockFetch({ aiAllowance: 0 }))
    const error = await api.parse({ url: 'https://paperly.com/pricing', title: 'P' }).catch((e) => e)
    expect(error).toMatchObject({ code: 'allowance', status: 429 })
    expect(error.suggestion).toMatchObject({ name: 'Paperly', amount: null, currency: null, source: 'merchant' })
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
