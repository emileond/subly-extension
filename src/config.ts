/** Origin of the Subly web app, set at build time with VITE_SUBLY_URL */
export const BASE_URL = (
  import.meta.env.VITE_SUBLY_URL || 'https://web.subly.app'
).replace(/\/+$/, '')

/** The web app's public Supabase project; the anon key is public by design and is only used to refresh the session */
export const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL || 'https://olqusypvbnvlyxibpbcg.supabase.co'
).replace(/\/+$/, '')
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MDMxNzk4MiwiZXhwIjoxOTU1ODkzOTgyfQ.vsXfdaXm17-hQrH5pz3xgvrYDb2DBKF_Z9UQujfTH0k'

export const LOGIN_URL = `${BASE_URL}/chrome-extension-login`
export const APP_ORIGIN = new URL(BASE_URL).origin
