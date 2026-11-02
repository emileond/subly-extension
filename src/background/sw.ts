import { APP_ORIGIN, LOGIN_URL } from '../config'
import { normalizeCredential } from '../lib/credential'
import { CREDENTIAL_KEY } from '../lib/storage'

/** The popup asks the service worker to open the sign-in page */
const OPEN_LOGIN = 'OPEN_LOGIN'
/** The sign-in page (web app) sends the extension's own token */
const SET_EXTENSION_TOKEN = 'SET_EXTENSION_TOKEN'

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only this extension's own pages may ask for the login tab
  if (sender.id !== chrome.runtime.id || message?.type !== OPEN_LOGIN) return false
  openLogin().then(() => sendResponse({ ok: true }))
  return true
})

async function openLogin() {
  const [existing] = await chrome.tabs.query({ url: `${LOGIN_URL}*` })
  if (existing?.id !== undefined) {
    await chrome.tabs.update(existing.id, { active: true })
    if (existing.windowId !== undefined) await chrome.windows.update(existing.windowId, { focused: true })
  } else {
    await chrome.tabs.create({ url: LOGIN_URL, active: true })
  }
}

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message?.type !== SET_EXTENSION_TOKEN) return false
  // externally_connectable already limits this to the Subly origin; check it again before keeping a token
  if (sender.origin !== APP_ORIGIN) {
    sendResponse({ ok: false })
    return false
  }
  const credential = normalizeCredential(message.payload)
  if (!credential) {
    sendResponse({ ok: false })
    return false
  }
  // { ok: false } makes the web page sign this token out again and offer a retry
  chrome.storage.local
    .set({ [CREDENTIAL_KEY]: credential })
    .then(() => sendResponse({ ok: true }))
    .catch(() => sendResponse({ ok: false }))
  return true
})

// Earlier builds kept a copy of the website's sign-in ("sessionData", "session"). There is no token to turn it into: forget it.
chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.remove(['sessionData', 'session'])
})
