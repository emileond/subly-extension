// logo.dev publishable key (pk_), meant for browser use; the same one the Subly app uses (subly-web lib/logo.js)
const LOGO_DEV_KEY = 'pk_WB761igcRjKR72C3FbRenQ'

/**
 * The logo Subly shows for a website, built exactly as the server builds it (subly-web `logoUrl`), so the popup
 * shows the logo the item will have. '' when there is no website.
 */
export function logoUrl(website: string): string {
  const domain = website
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/[/?#].*$/, '')
  return domain ? `https://img.logo.dev/${domain}?token=${LOGO_DEV_KEY}` : ''
}

/** What the popup shows: logo.dev for the website, else the page's own icon (a page with no website) */
export function shownLogo(website: string, pageIcon: string): string {
  return logoUrl(website) || pageIcon
}
