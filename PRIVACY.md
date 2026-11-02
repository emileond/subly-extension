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

All of this is processed inside your browser to prefill the form. It is not stored, and nothing leaves your browser
at this step. There are no content scripts: the reader is injected on demand, once per click, and never runs on a
page you did not open the extension on.

## What it sends, and when

Nothing is sent until you press one of two buttons. Everything goes to the Subly web app (`https://web.subly.app`),
with your Subly sign-in token, over HTTPS.

- **When the popup opens:** it asks Subly for your workspace, projects, categories, payment methods and tags (to fill
  the form's choices). No page content is sent.
- **Add to Subly:** sends the item you see in the form: name, amount, currency, how often it renews, next charge date,
  category, website, notes, project, payment method, tags and logo address, to the workspace you chose.
- **Read this page with AI** (optional, never automatic): sends the page address *without its query string or
  fragment*, the title, the meta tags above, the structured data and at most 6,000 characters of the page text it
  picked, so Subly can suggest a name, price, cycle and category. The popup shows the exact request before you press
  the button ("Show exactly what will be sent"). Subly reads it to answer and does not store it.

The extension has no analytics, no tracking and no remote code. It talks to no other server, except Subly's
authentication service, to renew your sign-in (see below).

## What it stores

In `chrome.storage.local`, on your computer: your sign-in session (the access token, the refresh token, when the access
token ends and your email address). Nothing else. Tokens are never logged.

## Signing in and out

Signing in happens on the Subly website (`/chrome-extension-login`), which sends the session to the extension. The
extension accepts it only from the Subly origin it was built for. It renews the access token with the refresh token by
calling Subly's authentication service (Supabase). **Sign out** deletes the session from this browser; it does not sign
you out of the website.

## Permissions

| Permission | Why |
| --- | --- |
| `activeTab` | Read the tab you are on, only when you click the extension. |
| `scripting` | Inject the page reader into that tab. |
| `storage` | Keep your sign-in session. |
| `https://web.subly.app/*` | Call the Subly API and receive the session from the sign-in page. |

## Questions

Open an issue on this repository.
