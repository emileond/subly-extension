/** What the extension keeps of a Subly session: the two tokens, when the access token ends, and who it is for */
export interface Session {
  accessToken: string
  refreshToken: string
  /** Unix seconds */
  expiresAt: number
  email: string | null
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const part = token.split('.')[1]
  if (!part) return null
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    )
    const payload = JSON.parse(json)
    return payload && typeof payload === 'object' ? payload : null
  } catch {
    return null
  }
}

const str = (value: unknown): string => (typeof value === 'string' ? value : '')

/**
 * Turns whatever came in (the web page's Supabase session, an older stored one, a refresh response) into the
 * minimal session, or null when it is not usable. Anything else on the input, such as provider tokens, is dropped.
 */
export function normalizeSession(input: unknown, nowSeconds = Date.now() / 1000): Session | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Record<string, unknown>
  const accessToken = str(raw.accessToken ?? raw.access_token)
  const refreshToken = str(raw.refreshToken ?? raw.refresh_token)
  if (!accessToken || !refreshToken) return null

  const claims = decodeJwtPayload(accessToken)
  const given = Number(raw.expiresAt ?? raw.expires_at)
  const expiresIn = Number(raw.expires_in)
  const expiresAt =
    Number.isFinite(given) && given > 0
      ? given
      : typeof claims?.exp === 'number'
        ? claims.exp
        : Number.isFinite(expiresIn) && expiresIn > 0
          ? Math.floor(nowSeconds + expiresIn)
          : Math.floor(nowSeconds + 3600)

  const user = raw.user && typeof raw.user === 'object' ? (raw.user as Record<string, unknown>) : null
  const email = str(raw.email) || str(user?.email) || str(claims?.email) || null

  return { accessToken, refreshToken, expiresAt, email }
}

/** True when the access token has ended or ends within `marginSeconds` */
export function isExpiring(session: Session, marginSeconds = 60, nowSeconds = Date.now() / 1000): boolean {
  return session.expiresAt - marginSeconds <= nowSeconds
}
