# Subly for Chrome

Add the subscription on the page you're viewing to [Subly](https://web.subly.app) in two clicks.

Open the extension on a pricing or checkout page and it prefills a small form: the service's name and logo, the plan
and price, the currency, how often it renews and when the next charge is. You fix what's wrong and press **Add to
Subly**. If the page is hard to read, **Read this page with AI** asks Subly to take a second look.

That's the whole product. It does not list, edit or analyse your subscriptions; the Subly app does that.

- What it reads, what it sends and when: [PRIVACY.md](PRIVACY.md)
- Manifest V3, React 18, TypeScript, Vite. One popup, one service worker, no content scripts.

## How it works

1. **Sign in.** The popup opens `https://web.subly.app/chrome-extension-login`. That page refreshes the person's
   session and sends it to the extension with `chrome.runtime.sendMessage(extensionId, { type: 'SET_SESSION',
   payload: { session } })`. The service worker (`src/background/sw.ts`) checks that the sender's origin is the Subly
   origin, keeps only the two tokens, the expiry and the email, and stores them in `chrome.storage.local`. The popup
   renews the access token with the refresh token when it ends (`src/lib/auth.ts`).
2. **Read the page.** When the popup opens, `chrome.scripting.executeScript` runs `collectPage`
   (`src/extract/collect.ts`) in the active tab (allowed by `activeTab` because the person clicked the extension). It
   returns the URL, title, metas, JSON-LD, microdata offers, icons and visible text.
3. **Understand it, on the device.** `src/extract/` turns that into a name, website, logo and a list of plans (price,
   currency, billing period), in this order of trust: JSON-LD, microdata and price metas, then the visible text. It
   parses `$9.99`, `9,99 €`, `¥1,200`, "per month", "/yr", "billed annually", "every 3 months", free trials and "from $X"
   and several plans on one page. Unknown fields stay empty; the popup says how sure it is.
4. **Save.** `POST /api/extension/items` with the form. A duplicate comes back as `409` and can be added anyway.

### The API it relies on

All requests send `Authorization: Bearer <access token>` to the Subly origin.

| Route | Used for |
| --- | --- |
| `GET /api/extension/context?workspace_id=` | the person, workspaces, projects, categories, payment methods, tags, plan limit |
| `POST /api/extension/items` | add one item (`201 { id, url }`, `409 { duplicateOf }`, `402/403` plan limit, `401` signed out) |
| `POST /api/extension/parse` | optional AI read of the page (`429` when the AI allowance is spent) |

The typed client is `src/api/client.ts` and the types are in `src/api/types.ts`.

## Develop

```bash
npm install
npm test          # unit and UI tests (vitest)
npm run lint
npm run build     # tsc + vite build → dist/
```

### Try the popup without Chrome or a server

```bash
npm run dev       # then open http://localhost:5173
```

This runs the popup in a normal tab against an in-memory mock of the three routes (`src/api/mock.ts`) and saved pages
(`src/extract/__fixtures__/`). Pick the "open tab" with `?page=<fixture>` (`jsonld-offers`, `meta-price`, `toggle-text`,
`free-trial`, `spanish`, `german-eur`, `billed-annually`, `lifetime`, `no-price`, or `none` for an unreadable page).
`?signedout=1` starts signed out; `?limit=1` puts the account at its plan limit. In the mock, a name starting with
"Netflix" is a duplicate and one starting with "Limit" hits the plan limit. The mock and the fixtures are not part of
a normal build.

### Load it in Chrome

1. `npm run build`
2. Open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked** and select the `dist` folder.
3. Pin the extension, open a pricing page, click the icon.

The extension's id is fixed by the public `key` in `manifest.ts`: **`adkphphbcoohfcgjhajhkedngglechcj`**. The web app
needs that id (`NEXT_PUBLIC_CHROME_EXTENSION_ID`) to hand the session over.

### Point it at a local web app

The Subly origin is set when you build. The published build uses `https://web.subly.app` and only that origin in
`host_permissions` and `externally_connectable`. For a local web app:

```bash
VITE_SUBLY_URL=http://localhost:3000 npm run build
```

That build's manifest allows `http://localhost:3000/*` instead of `https://web.subly.app/*`; load `dist` unpacked. Run
the web app with `NEXT_PUBLIC_CHROME_EXTENSION_ID=adkphphbcoohfcgjhajhkedngglechcj`.

Refreshing the session talks to the web app's Supabase project. By default that is the production project; if your
local web app uses another one, also set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (both are public values).

### Layout

```
manifest.ts            manifest generated at build time (permissions live here)
src/background/sw.ts   service worker: opens the sign-in tab, receives SET_SESSION
src/extract/           reading a page: collect (injected), JSON-LD, prices, cycles, names, extraction + tests/fixtures
src/api/               typed client for the three routes, types, mock server
src/lib/               session handling, token refresh, storage, dates
src/page/              reading the active tab
src/ui/                the popup (React)
src/dev/               dev-only deps (mock + fixtures), not in the build
```

## Publish

1. Bump `version` in `package.json` (the manifest takes it from there).
2. `npm run build`
3. Zip the contents of `dist/` (not the folder itself) and upload it in the Chrome Web Store developer dashboard.
