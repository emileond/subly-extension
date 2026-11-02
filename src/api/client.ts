import {
  ApiError,
  type AddItemRequest,
  type AddItemResult,
  type ApiErrorCode,
  type ExtensionContext,
  type Suggestion,
} from './types'
import type { ParseRequest } from '../extract/ai'

export interface ApiClient {
  getContext(workspaceId?: number): Promise<ExtensionContext>
  addItem(request: AddItemRequest): Promise<AddItemResult>
  parse(request: ParseRequest): Promise<Suggestion>
}

export interface ApiOptions {
  baseUrl: string
  /** The current access token, or null when signed out */
  getToken: () => Promise<string | null>
  /** Called on any 401: the stored token is no longer accepted and has to be cleared */
  onSignedOut: () => void
  fetch?: typeof fetch
  timeoutMs?: number
}

/** The server answers `{ error: { code, message } }` (or `{ error: "text" }`); this is the text */
function errorMessage(body: unknown): string {
  const error = (body as { error?: unknown } | null)?.error
  if (typeof error === 'string') return error
  const message = (error as { message?: unknown } | undefined)?.message
  return typeof message === 'string' ? message : ''
}

const errorCode = (body: unknown): string => {
  const code = ((body as { error?: { code?: unknown } } | null)?.error as { code?: unknown } | undefined)?.code
  return typeof code === 'string' ? code : ''
}

/** Every 401 means "sign in again"; the code only changes why we say it */
const SIGNED_OUT: Record<string, string> = {
  invalid_token: 'You were signed out of the extension, or you signed in again on another browser. Sign in again to keep adding.',
  token_expired: 'Your sign-in for the extension ended after 90 days. Sign in again to keep adding.',
  mfa_required: 'Two-factor sign-in was turned on for your account. Sign in again and enter the code.',
}
export const signedOutMessage = (code: string) =>
  SIGNED_OUT[code] ?? 'The extension is not signed in to Subly. Sign in to keep adding.'

const FALLBACK: Record<ApiErrorCode, string> = {
  unauthorized: signedOutMessage(''),
  forbidden: 'Your Subly account has no workspace yet. Finish setting up at web.subly.app, then try again.',
  limit: 'Your plan does not allow adding more items.',
  allowance: 'You have used this month’s AI allowance.',
  rate: 'Too many requests. Wait a minute and try again.',
  validation: 'Subly did not accept these details. Check the fields and try again.',
  network: 'Could not reach Subly. Check your connection and try again.',
  server: 'Subly had a problem. Try again in a moment.',
}

export function createApiClient(options: ApiOptions): ApiClient {
  const doFetch = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args))

  async function send(path: string, init: { method: string; body?: unknown }, parse: boolean): Promise<{ status: number; body: unknown }> {
    const attempt = async (token: string) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 25000)
      try {
        const response = await doFetch(`${options.baseUrl}${path}`, {
          method: init.method,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          },
          body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
          signal: controller.signal,
        })
        const body = await response.json().catch(() => null)
        return { status: response.status, body }
      } catch {
        throw new ApiError('network', FALLBACK.network)
      } finally {
        clearTimeout(timer)
      }
    }

    const token = await options.getToken()
    if (!token) {
      options.onSignedOut()
      throw new ApiError('unauthorized', FALLBACK.unauthorized, 401, 'unauthorized')
    }
    // No renewing and no retry: a 401 always means the person has to sign in again
    const result = await attempt(token)
    if (result.status === 401) {
      const code = errorCode(result.body)
      options.onSignedOut()
      throw new ApiError('unauthorized', signedOutMessage(code), 401, code)
    }
    return failOnError(result, parse)
  }

  function failOnError(result: { status: number; body: unknown }, isParse: boolean) {
    const { status, body } = result
    if (status >= 200 && status < 300) return result
    // 409 carries the existing item and is an answer, not an error (the caller reads it)
    if (status === 409) return result
    const code: ApiErrorCode =
      status === 402
        ? 'limit'
        : status === 403
          ? 'forbidden'
          : status === 429
          ? isParse
            ? 'allowance'
            : 'rate'
          : status === 400 || status === 422
            ? 'validation'
            : status >= 500
              ? 'server'
              : 'server'
    const suggestion = (body as { suggestion?: Suggestion } | null)?.suggestion ?? null
    // A 403 means no workspace yet (or someone else's): say where to fix it, not the server's code
    const message = code === 'forbidden' || code === 'allowance' ? FALLBACK[code] : errorMessage(body) || FALLBACK[code]
    throw new ApiError(code, message, status, errorCode(body), suggestion)
  }

  return {
    async getContext(workspaceId) {
      const query = workspaceId ? `?workspace_id=${workspaceId}` : ''
      const { body } = await send(`/api/extension/context${query}`, { method: 'GET' }, false)
      return normalizeContext(body)
    },
    async addItem(request) {
      const { status, body } = await send('/api/extension/items', { method: 'POST', body: request }, false)
      if (status === 409) {
        const duplicate = (body as { duplicateOf?: { id?: unknown; name?: unknown } } | null)?.duplicateOf
        if (duplicate && typeof duplicate.id === 'number') {
          return { kind: 'duplicate', duplicateOf: { id: duplicate.id, name: String(duplicate.name ?? '') } }
        }
        throw new ApiError('validation', errorMessage(body) || FALLBACK.validation, 409)
      }
      const created = body as { id?: unknown; url?: unknown } | null
      if (typeof created?.id !== 'number') throw new ApiError('server', FALLBACK.server, status)
      return { kind: 'created', id: created.id, url: typeof created.url === 'string' ? created.url : '' }
    },
    async parse(request) {
      const { body } = await send('/api/extension/parse', { method: 'POST', body: request }, true)
      const suggestion = (body as { suggestion?: Suggestion } | null)?.suggestion
      if (!suggestion) throw new ApiError('server', FALLBACK.server)
      return suggestion
    },
  }
}

/** The context with every list present, whatever the server left out */
function normalizeContext(body: unknown): ExtensionContext {
  const b = (body ?? {}) as Partial<ExtensionContext>
  if (!b.workspace || typeof b.workspace.id !== 'number') throw new ApiError('server', FALLBACK.server)
  return {
    user: b.user ?? { id: '', email: '' },
    workspace: {
      id: b.workspace.id,
      name: b.workspace.name ?? '',
      baseCurrency: b.workspace.baseCurrency || 'USD',
      locale: b.workspace.locale ?? 'en',
    },
    workspaces: b.workspaces?.length ? b.workspaces : [{ id: b.workspace.id, name: b.workspace.name ?? '' }],
    projects: b.projects ?? [],
    categories: b.categories ?? [],
    paymentMethods: b.paymentMethods ?? [],
    tags: b.tags ?? [],
    canAdd: b.canAdd !== false,
    limitReason: b.limitReason ?? null,
  }
}
