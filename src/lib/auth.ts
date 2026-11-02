import { normalizeCredential, type Credential } from './credential'
import { CREDENTIAL_KEY, storage } from './storage'

export interface Auth {
  /** The stored credential (expired or not), or null when signed out */
  getCredential(): Promise<Credential | null>
  /** The token to send as the bearer, or null when signed out */
  getToken(): Promise<string | null>
  /** Forgets the token (after a 401, or when the person signs out). The website session is not touched. */
  signOut(): Promise<void>
}

/** The extension's token is its own credential: there is nothing to renew, signing in again replaces it */
export function createAuth(): Auth {
  const getCredential = async () => normalizeCredential(await storage.get(CREDENTIAL_KEY))
  return {
    getCredential,
    getToken: async () => (await getCredential())?.token ?? null,
    signOut: () => storage.remove(CREDENTIAL_KEY),
  }
}
