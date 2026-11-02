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

/** amount, currency and category are null when the page did not give one */
export interface Suggestion {
  name: string
  amount: number | null
  currency: string | null
  billingFreq: number
  billingRange: 'day' | 'week' | 'month' | 'year'
  category: string | null
  website: string | null
  confidence: 'high' | 'medium' | 'low'
  source: 'jsonld' | 'merchant' | 'ai'
}

export type ApiErrorCode =
  /** Any 401: the extension token is gone, replaced, expired or refused. Sign in again */
  | 'unauthorized'
  /** 403: the account has no workspace yet, or the workspace is not the person's */
  | 'forbidden'
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
    public status = 0,
    /** The server's `error.code`, e.g. invalid_token */
    public serverCode = '',
    /** On a 429 from parse: the server's on-device-style suggestion, still worth prefilling */
    public suggestion: Suggestion | null = null
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
