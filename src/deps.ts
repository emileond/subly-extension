import { createApiClient, type ApiClient } from './api/client'
import { BASE_URL } from './config'
import { createAuth, type Auth } from './lib/auth'
import { readActivePage, type PageRead } from './page/readPage'

/** What the popup needs from outside itself; tests and the dev page swap these for fakes */
export interface Deps {
  api: ApiClient
  auth: Auth
  readPage: () => Promise<PageRead>
  /** Opens the web app's sign-in page, which hands the session back to the extension */
  openLogin: () => Promise<void>
  baseUrl: string
}

export function createDeps(): Deps {
  const auth = createAuth()
  return {
    auth,
    api: createApiClient({
      baseUrl: BASE_URL,
      getToken: auth.getAccessToken,
      refreshToken: auth.refresh,
      onSignedOut: () => void auth.signOut(),
    }),
    readPage: readActivePage,
    openLogin: async () => {
      await chrome.runtime.sendMessage({ type: 'OPEN_LOGIN' })
    },
    baseUrl: BASE_URL,
  }
}
