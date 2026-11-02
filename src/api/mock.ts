import type { AddItemRequest, ExtensionContext } from './types'

/** The access token the mock accepts */
export const MOCK_TOKEN = 'mock-token'

const CATEGORIES = ['Entertainment', 'Software', 'Productivity', 'Health & Fitness', 'Education', 'News', 'Utilities', 'Other']

const WORKSPACES = [
  { id: 1, name: 'Personal', baseCurrency: 'USD', locale: 'en' },
  { id: 2, name: 'Acme Studio', baseCurrency: 'EUR', locale: 'en' },
]

function contextFor(workspaceId: number, canAdd: boolean): ExtensionContext {
  const workspace = WORKSPACES.find((w) => w.id === workspaceId) ?? WORKSPACES[0]
  const personal = workspace.id === 1
  return {
    user: { id: 'user-1', email: 'sam@example.com' },
    workspace,
    workspaces: WORKSPACES.map(({ id, name }) => ({ id, name })),
    projects: personal
      ? [{ id: 11, name: 'Home', isDefault: true }, { id: 12, name: 'Side projects', isDefault: false }]
      : [{ id: 21, name: 'Client work', isDefault: true }],
    categories: CATEGORIES,
    paymentMethods: personal ? [{ id: 31, name: 'Visa ••4242' }, { id: 32, name: 'PayPal' }] : [{ id: 41, name: 'Company Amex' }],
    tags: [{ id: 51, name: 'work', color: '#6F55FF' }, { id: 52, name: 'family', color: '#E5484D' }],
    canAdd,
    limitReason: canAdd ? null : 'Your Free plan includes 10 items and you have 10. Upgrade to add more.',
  }
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

export interface MockOptions {
  /** Milliseconds each answer takes, to see loading states */
  delay?: number
  /** Answer the context with canAdd: false */
  atLimit?: boolean
  /** Parse calls answered before the AI allowance runs out */
  aiAllowance?: number
}

/**
 * A fetch that answers the three extension routes like the web app does. Rules for trying things out:
 * a name starting with "Netflix" is already in the account (409 unless force), one starting with "Limit" hits the
 * plan limit (402), a token other than MOCK_TOKEN is a 401.
 */
export function createMockFetch(options: MockOptions = {}) {
  let nextId = 100
  let parseCalls = 0
  const calls: { path: string; body: unknown }[] = []

  const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    if (options.delay) await new Promise((resolve) => setTimeout(resolve, options.delay))

    const auth = new Headers(init?.headers).get('Authorization')
    if (auth !== `Bearer ${MOCK_TOKEN}`) return json(401, { error: { code: 'unauthorized', message: 'Invalid token' } })

    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ path: url.pathname, body })

    if (url.pathname === '/api/extension/context' && init?.method === 'GET') {
      const id = Number(url.searchParams.get('workspace_id')) || 1
      return json(200, contextFor(id, !options.atLimit))
    }

    if (url.pathname === '/api/extension/items' && init?.method === 'POST') {
      const { workspaceId, force, item } = body as AddItemRequest
      if (!item.name || !(item.amount >= 0)) return json(400, { error: { code: 'invalid', message: 'Name and amount are required.' } })
      if (/^limit/i.test(item.name)) return json(402, { error: { code: 'plan_limit', message: 'Your Free plan includes 10 items. Upgrade to add more.' } })
      if (/^netflix/i.test(item.name) && !force) return json(409, { duplicateOf: { id: 7, name: 'Netflix' } })
      const id = nextId++
      return json(201, { id, url: `${url.origin}/recurring/${id}?workspace=${workspaceId}` })
    }

    if (url.pathname === '/api/extension/parse' && init?.method === 'POST') {
      parseCalls++
      if (parseCalls > (options.aiAllowance ?? 2)) {
        return json(429, { error: { code: 'ai_allowance', message: 'You have used this month’s AI allowance.' } })
      }
      const page = new URL(body.url)
      const brand = page.hostname.split('.').slice(-2)[0]
      return json(200, {
        suggestion: {
          name: brand.charAt(0).toUpperCase() + brand.slice(1),
          amount: 12,
          currency: 'USD',
          billingFreq: 1,
          billingRange: 'month',
          category: 'Software',
          website: page.origin,
          confidence: 'medium',
          source: 'ai',
        },
      })
    }
    return json(404, { error: { code: 'not_found', message: 'Not found' } })
  }

  return Object.assign(mockFetch, { calls })
}
