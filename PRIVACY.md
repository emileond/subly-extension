# Privacy

The Subly extension does one thing: it reads the page you have open, only when you click the extension, so it can
prefill a form for adding that page's subscription to your Subly account. This file says exactly what it reads, what
it sends and when. The code is in this repository.

## What it reads

When you click the Subly icon, the extension reads the tab you are on (Chrome's `activeTab` permission gives it
access to that tab only, only for that click). It looks at:

- the address (URL), the page title and the `lang` of the page
- meta tags: Open Graph (`og:*`), Twitter (`twitter:*`), product and price tags, the description and a few others
- structured data (JSON-LD and schema.org microdata) that describes prices, offers, the site or the company
- the page's icons (favicon, apple-touch-icon)
- the visible text of the page, to find prices and plan names (the first part of long pages plus the lines around
  prices)

All of this is processed inside your browser to prefill the form. It is not stored, and no page content leaves your
browser at this step. To show the service's logo next to its name, the popup loads it from logo.dev
(`https://img.logo.dev/<domain>`), the logo service the Subly app uses: that request carries the site's domain (for
example `notion.so`), never the full address or anything from the page, and is sent without a referrer. There are no content scripts: the reader is injected on demand, once per click, and never runs on a
page you did not open the extension on.

## What it sends, and when

Nothing is sent until you press one of two buttons. Everything goes to the Subly web app (`https://web.subly.app`),
with the extension's Subly token, over HTTPS.

- **When the popup opens:** it asks Subly for your workspace, projects, categories, payment methods and tags (to fill
  the form's choices). No page content is sent.
- **Add to Subly:** sends the item you see in the form: name, amount, currency, how often it renews, next charge date,
  category, website, notes, project, payment method and tags, to the workspace you chose. Subly takes the logo from the
  website (logo.dev); only when you clear the website does it send the page's own icon address instead.
- **Read this page with AI** (optional, never automatic): sends the page address *without its query string or
  fragment*, the title, the meta tags above, the structured data and at most 6,000 characters of the page text it
  picked, so Subly can suggest a name, price, cycle and category. The popup shows the exact request before you press
  the button ("What gets sent"). Subly reads it to answer and does not store it.

The extension has no analytics, no tracking and no remote code. It talks to no other server, except logo.dev for the
logo picture described above. Its fonts are bundled, so it fetches none.

## What it stores

In `chrome.storage.local`, on your computer: the extension's Subly token, when it ends (90 days after you sign in) and your
account's id and email. Nothing else. The token belongs to the extension alone: it is valid on the extension's three
Subly routes and nowhere else, and it is not your website sign-in. Tokens are never logged.

## Signing in and out

Signing in happens on the Subly website (`/chrome-extension-login`), which creates the token and sends it to the extension.
The extension accepts it only from the Subly origin it was built for. When it ends or is replaced, you sign in again;
there is no background renewal. **Sign out** in the popup deletes the token from this browser, and you can also sign the
extension out from **Connections** in the Subly web app, which stops the token working everywhere. Neither signs you out
of the website. Signing out of the website does not sign the extension out, but the actions that end every other sign-in
do: **Sign out other devices**, changing your password and setting a new one from a reset link.

## Permissions

| Permission | Why |
| --- | --- |
| `activeTab` | Read the tab you are on, only when you click the extension. |
| `scripting` | Inject the page reader into that tab. |
| `storage` | Keep the extension's Subly token. |
| `https://web.subly.app/*` | Call the Subly API and receive the token from the sign-in page. |

## Questions

Open an issue on this repository.
