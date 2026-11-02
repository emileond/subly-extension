import { collectPage } from '../extract/collect'
import type { PageSnapshot } from '../extract/types'

export type PageRead =
  | { status: 'ok'; snapshot: PageSnapshot }
  /** Browser pages, the Web Store, PDFs and the like cannot be read; the form still works */
  | { status: 'unreadable'; reason: 'restricted' | 'failed' }

/**
 * Reads the tab the person has open. Only works because they clicked the extension (activeTab): the page is read
 * once, here, by injecting collectPage on demand. Nothing is sent anywhere.
 */
export async function readActivePage(): Promise<PageRead> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id === undefined || !tab.url || !/^https?:\/\//i.test(tab.url)) {
      return { status: 'unreadable', reason: 'restricted' }
    }
    const [injection] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: collectPage })
    const snapshot = injection?.result as PageSnapshot | undefined
    return snapshot ? { status: 'ok', snapshot } : { status: 'unreadable', reason: 'failed' }
  } catch {
    // The Chrome Web Store and some other pages refuse injection
    return { status: 'unreadable', reason: 'restricted' }
  }
}
