/** What the extension keeps after signing in: its own Subly token (valid on the extension routes only), when it ends, and who it is for */
export interface Credential {
  /** "sbx_…" */
  token: string
  /** ISO 8601 UTC, 90 days after sign-in */
  expiresAt: string
  user: { id: string; email: string }
}

const str = (value: unknown): string => (typeof value === 'string' ? value : '')

/**
 * The payload of the web page's SET_EXTENSION_TOKEN message (or the stored shape) as a Credential, or null when it is
 * not one. Anything else on the input is dropped.
 */
export function normalizeCredential(input: unknown): Credential | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Record<string, unknown>
  const token = str(raw.token)
  const expiresAt = str(raw.expiresAt)
  const user = raw.user && typeof raw.user === 'object' ? (raw.user as Record<string, unknown>) : null
  if (!token.startsWith('sbx_') || token.length < 12) return null
  if (!expiresAt || Number.isNaN(Date.parse(expiresAt))) return null
  const id = str(user?.id)
  const email = str(user?.email)
  if (!id || !email) return null
  return { token, expiresAt, user: { id, email } }
}

export const isExpired = (credential: Credential, now = Date.now()) => Date.parse(credential.expiresAt) <= now

const WEEK = 7 * 24 * 60 * 60 * 1000

/** True in the last 7 days of the token's life: time to offer signing in again */
export const expiresSoon = (credential: Credential, now = Date.now()) =>
  !isExpired(credential, now) && Date.parse(credential.expiresAt) - now <= WEEK
