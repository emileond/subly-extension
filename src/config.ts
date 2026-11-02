/** Origin of the Subly web app, set at build time with VITE_SUBLY_URL */
export const BASE_URL = (
  import.meta.env.VITE_SUBLY_URL || 'https://web.subly.app'
).replace(/\/+$/, '')

export const LOGIN_URL = `${BASE_URL}/chrome-extension-login`
export const APP_ORIGIN = new URL(BASE_URL).origin
