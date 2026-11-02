/** chrome.storage.local in the extension; localStorage when the popup runs in a plain browser tab (npm run dev, tests) */
type Area = {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
  remove(key: string): Promise<void>
}

const chromeArea = (): chrome.storage.LocalStorageArea | null =>
  typeof chrome !== 'undefined' && chrome.storage?.local ? chrome.storage.local : null

export const storage: Area = {
  async get(key) {
    const area = chromeArea()
    if (area) return (await area.get(key))[key]
    try {
      const raw = localStorage.getItem(`subly:${key}`)
      return raw ? JSON.parse(raw) : undefined
    } catch {
      return undefined
    }
  },
  async set(key, value) {
    const area = chromeArea()
    if (area) return area.set({ [key]: value })
    try {
      localStorage.setItem(`subly:${key}`, JSON.stringify(value))
    } catch {
      /* storage blocked */
    }
  },
  async remove(key) {
    const area = chromeArea()
    if (area) return area.remove(key)
    try {
      localStorage.removeItem(`subly:${key}`)
    } catch {
      /* storage blocked */
    }
  },
}

export const SESSION_KEY = 'session'
