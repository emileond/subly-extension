import { APP_ORIGIN, LOGIN_URL } from '../config'
import { normalizeSession } from '../lib/session'
import { SESSION_KEY } from '../lib/storage'

/** The popup asks the service worker to open the sign-in page */
const OPEN_LOGIN = 'OPEN_LOGIN'
/** The sign-in page (web app) sends the signed-in session */
const SET_SESSION = 'SET_SESSION'

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
  if (message?.type !== SET_SESSION) return false
  // externally_connectable already limits this to the Subly origin; check it again before keeping a session
  if (sender.origin !== APP_ORIGIN) {
    sendResponse({ ok: false, error: 'origin' })
    return false
  }
  const session = normalizeSession(message.payload?.session)
  if (!session) {
    sendResponse({ ok: false, error: 'session' })
    return false
  }
  chrome.storage.local
    .set({ [SESSION_KEY]: session })
    .then(() => sendResponse({ ok: true }))
    .catch(() => sendResponse({ ok: false, error: 'storage' }))
  return true
})

// Version 0.0.x kept the whole Supabase session under "sessionData"; keep only what is needed, under the new key
chrome.runtime.onInstalled.addListener(async () => {
  const { sessionData } = await chrome.storage.local.get('sessionData')
  if (sessionData === undefined) return
  const session = normalizeSession(sessionData)
  if (session) await chrome.storage.local.set({ [SESSION_KEY]: session })
  await chrome.storage.local.remove('sessionData')
})
