export interface Workspace {
  id: number
  name: string
}

export interface ExtensionContext {
  user: { id: string; email: string }
  workspace: { id: number; name: string; baseCurrency: string; locale: string }
  workspaces: Workspace[]
  projects: { id: number; name: string; isDefault: boolean }[]
  categories: string[]
  paymentMethods: { id: number; name: string }[]
  tags: { id: number; name: string; color: string | null }[]
  canAdd: boolean
  limitReason: string | null
}

export interface NewItem {
  name: string
  direction?: 'out' | 'in'
  amount: number
  currency: string
  isRecurring?: boolean
  billingFreq?: number
  billingRange?: 'day' | 'week' | 'month' | 'year'
  nextChargeDate?: string
  category?: string | null
  website?: string | null
  notes?: string | null
  projectId?: number | null
  tagIds?: number[]
  paymentMethodId?: number | null
  logo?: string | null
}

export interface AddItemRequest {
  workspaceId: number
  force?: boolean
  item: NewItem
}

export type AddItemResult =
  | { kind: 'created'; id: number; url: string }
  | { kind: 'duplicate'; duplicateOf: { id: number; name: string } }

export interface Suggestion {
  name: string
  amount: number
  currency: string
  billingFreq: number
  billingRange: 'day' | 'week' | 'month' | 'year'
  category: string | null
  website: string | null
  confidence: 'high' | 'medium' | 'low'
  source: 'jsonld' | 'merchant' | 'ai'
}

export type ApiErrorCode =
  /** The token is no longer valid: sign in again */
  | 'unauthorized'
  /** The plan does not allow adding more (402/403) */
  | 'limit'
  /** The plan's AI allowance is spent (429 on parse) */
  | 'allowance'
  /** Too many requests in a short time (429 elsewhere) */
  | 'rate'
  | 'validation'
  | 'network'
  | 'server'

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status = 0
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
