// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any -- request bodies are inspected loosely */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../api/client'
import { MOCK_TOKEN, createMockFetch, type MockOptions } from '../api/mock'
import type { Deps } from '../deps'
import { fixtureSnapshot } from '../extract/__fixtures__'
import type { PageRead } from '../page/readPage'
import App from './App'

afterEach(cleanup)

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString()
const credential = (days = 90) => ({ token: MOCK_TOKEN, expiresAt: inDays(days), user: { id: 'user-1', email: 'sam@example.com' } })

function setup(options: { page?: string | null; signedIn?: boolean; token?: string; days?: number; mock?: MockOptions } = {}) {
  const mock = createMockFetch(options.mock)
  const signOut = vi.fn(async () => {})
  const openLogin = vi.fn(async () => {})
  const page: PageRead =
    options.page === null
      ? { status: 'unreadable', reason: 'restricted' }
      : { status: 'ok', snapshot: fixtureSnapshot(options.page ?? 'jsonld-offers') }
  const token = options.token ?? MOCK_TOKEN
  const deps: Deps = {
    auth: {
      getCredential: async () => (options.signedIn === false ? null : credential(options.days)),
      getToken: async () => token,
      signOut,
    },
    api: createApiClient({
      baseUrl: 'https://web.subly.app',
      getToken: async () => token,
      onSignedOut: () => void signOut(),
      fetch: mock as unknown as typeof fetch,
    }),
    readPage: async () => page,
    openLogin,
    baseUrl: 'https://web.subly.app',
  }
  return { user: userEvent.setup(), deps, mock, signOut, openLogin, ...render(<App deps={deps} />) }
}

const field = (name: RegExp | string) => screen.findByRole('textbox', { name })
const posted = (mock: ReturnType<typeof createMockFetch>, path: string) =>
  mock.calls.filter((c) => c.path === path) as { path: string; body: any }[]

describe('signed out', () => {
  it('explains and opens the sign-in page', async () => {
    const { user, openLogin } = setup({ signedIn: false })
    await user.click(await screen.findByRole('button', { name: 'Sign in to Subly' }))
    expect(openLogin).toHaveBeenCalled()
  })

  it('shows the signed-in email in the account menu and signs out', async () => {
    const { user, signOut } = setup()
    await user.click(await screen.findByRole('button', { name: 'Account' }))
    expect(await screen.findByText('sam@example.com')).toBeTruthy()
    expect((screen.getByRole('menuitem', { name: 'Open Subly' }) as HTMLAnchorElement).href).toBe('https://web.subly.app/')
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    expect(signOut).toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: 'Sign in to Subly' })).toBeTruthy()
  })

  it('tells the person to click the icon again after opening the sign-in tab', async () => {
    const { user } = setup({ signedIn: false })
    await user.click(await screen.findByRole('button', { name: 'Sign in to Subly' }))
    expect(await screen.findByText(/Waiting for you to sign in/)).toBeTruthy()
  })

  it.each([
    ['sbx_other', /another browser/],
    ['sbx_expired', /90 days/],
    ['sbx_mfa', /two-factor/i],
  ])('goes back to signed out, clearing the token, when the server answers 401 for %s', async (token, words) => {
    const { signOut } = setup({ token })
    expect(await screen.findByText(words)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sign in to Subly' })).toBeTruthy()
    expect(signOut).toHaveBeenCalled()
  })

  it('is signed out, with the 90 days message, when the stored token has ended', async () => {
    const { signOut } = setup({ days: -1 })
    expect(await screen.findByText(/90 days/)).toBeTruthy()
    expect(signOut).toHaveBeenCalled()
  })

  it('offers signing in again in the last 7 days of the token', async () => {
    const { user, openLogin } = setup({ days: 3 })
    await user.click(await screen.findByRole('button', { name: 'Sign in again' }))
    expect(openLogin).toHaveBeenCalled()
  })

  it('does not nag earlier than that', async () => {
    setup()
    await field('Name')
    expect(screen.queryByText(/ends soon/)).toBeNull()
  })
})

describe('adding the page', () => {
  it('prefills from the page, offers its plans, and saves with the contract body', async () => {
    const { user, mock } = setup()
    expect(await field('Name')).toHaveProperty('value', 'Paperly')
    // The logo the app will show (logo.dev for the website), not the page's own icon
    expect(document.querySelector('.with-logo img')?.getAttribute('src')).toMatch(/^https:\/\/img\.logo\.dev\/paperly\.com\?token=pk_/)
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveProperty('value', '10')
    expect(screen.getByRole('radio', { name: /Plus/ })).toHaveProperty('checked', true)

    await user.click(screen.getByRole('radio', { name: /Business/ }))
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveProperty('value', '18')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Software')
    await user.click(screen.getByRole('button', { name: 'Add to Subly' }))

    expect(await screen.findByRole('heading', { name: 'Added to Subly' })).toBeTruthy()
    const link = screen.getByRole('link', { name: 'Open in Subly' }) as HTMLAnchorElement
    expect(link.href).toMatch(/^https:\/\/web\.subly\.app\/recurring\/\d+/)

    const [{ body }] = posted(mock, '/api/extension/items')
    expect(body).toMatchObject({
      workspaceId: 1,
      item: {
        name: 'Paperly', direction: 'out', amount: 18, currency: 'USD', isRecurring: true, billingFreq: 1,
        billingRange: 'month', category: 'Software', website: 'https://www.paperly.com', projectId: null,
        paymentMethodId: null, tagIds: [], notes: 'Plan: Business', logo: null,
      },
    })
    expect(body.force).toBeUndefined()
    expect(body.item.nextChargeDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    await user.click(screen.getByRole('button', { name: 'Add another' }))
    expect(await field('Name')).toHaveProperty('value', 'Paperly')
  })

  it('sends a project, payment method and tags only when chosen', async () => {
    const { user, mock } = setup()
    await field('Name')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Project' }), 'Side projects')
    await user.click(screen.getByText('More details'))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Payment method' }), 'PayPal')
    await user.click(screen.getByRole('button', { name: 'family' }))
    await user.click(screen.getByRole('button', { name: 'Add to Subly' }))
    await screen.findByRole('heading', { name: 'Added to Subly' })
    expect(posted(mock, '/api/extension/items')[0].body.item).toMatchObject({ projectId: 12, paymentMethodId: 32, tagIds: [52] })
  })

  it('shows "Already in Subly" on a 409 and resends with force on "Add anyway"', async () => {
    const { user, mock } = setup()
    const name = await field('Name')
    await user.clear(name)
    await user.type(name, 'Netflix')
    await user.click(screen.getByRole('button', { name: 'Add to Subly' }))

    const alert = await screen.findByText('Already in Subly:')
    expect(alert.parentElement?.textContent).toContain('Netflix')
    expect((within(alert.parentElement as HTMLElement).getByRole('link', { name: 'View it' }) as HTMLAnchorElement).href).toBe('https://web.subly.app/recurring/7')

    await user.click(screen.getByRole('button', { name: 'Add anyway' }))
    expect(await screen.findByRole('heading', { name: 'Added to Subly' })).toBeTruthy()
    const bodies = posted(mock, '/api/extension/items').map((c) => c.body)
    expect(bodies.map((b) => b.force)).toEqual([undefined, true])
  })

  it('says plan limits in the server\'s words and keeps the form', async () => {
    const { user } = setup()
    const name = await field('Name')
    await user.clear(name)
    await user.type(name, 'Limit test')
    await user.click(screen.getByRole('button', { name: 'Add to Subly' }))
    expect(await screen.findByText(/Free plan includes 10 items/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add to Subly' })).toHaveProperty('disabled', false)
  })

  it('blocks saving and says why when the account is at its limit', async () => {
    setup({ mock: { atLimit: true } })
    expect(await screen.findByText(/can’t add more right now/)).toBeTruthy()
    expect(screen.getByText(/item limit is reached/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add to Subly' })).toHaveProperty('disabled', true)
  })

  it('switches workspace and loads its projects', async () => {
    const { user, mock } = setup()
    await field('Name')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Workspace' }), 'Acme Studio')
    await waitFor(() => expect(screen.getByRole('option', { name: 'Client work' })).toBeTruthy())
    expect(posted(mock, '/api/extension/context').map((c) => c.path)).toHaveLength(2)
    expect(screen.queryByRole('option', { name: 'Side projects' })).toBeNull()
  })

  it('asks for missing details instead of sending them', async () => {
    const { user, mock } = setup({ page: 'no-price' })
    expect(await screen.findByText(/We couldn’t find a price here/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Add to Subly' }))
    expect(await screen.findByText('Enter the amount it costs.')).toBeTruthy()
    expect(posted(mock, '/api/extension/items')).toHaveLength(0)
  })

  it('still works on a page it cannot read', async () => {
    const { user, mock } = setup({ page: null })
    expect(await screen.findByText(/can’t read this page/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Read this page with AI' })).toBeNull()
    await user.type(await field('Name'), 'Gym')
    await user.type(screen.getByRole('textbox', { name: 'Amount' }), '29,90')
    await user.click(screen.getByRole('button', { name: 'Add to Subly' }))
    await screen.findByRole('heading', { name: 'Added to Subly' })
    expect(posted(mock, '/api/extension/items')[0].body.item).toMatchObject({ name: 'Gym', amount: 29.9, website: null, logo: null })
  })
})

describe('Read this page with AI', () => {
  it('sends nothing until pressed, then fills the form without overwriting what was typed', async () => {
    const { user, mock } = setup({ page: 'no-price' })
    const name = await field('Name')
    expect(posted(mock, '/api/extension/parse')).toHaveLength(0)

    await user.clear(name)
    await user.type(name, 'My own name')
    await user.click(screen.getByRole('button', { name: 'Read this page with AI' }))
    await screen.findByText(/Filled in by AI/)

    const [{ body }] = posted(mock, '/api/extension/parse')
    expect(body.url).toBe('https://blog.example-news.org/2026/10/how-we-built-it')
    // Only the fields the contract lists, plus the workspace whose allowance is spent
    expect(Object.keys(body).every((k) => ['url', 'title', 'siteName', 'description', 'jsonLd', 'metas', 'text', 'workspaceId'].includes(k))).toBe(true)
    expect((name as HTMLInputElement).value).toBe('My own name')
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveProperty('value', '12')
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveProperty('value', 'Software')
  })

  it('says when the AI allowance is spent', async () => {
    const { user } = setup({ page: 'no-price', mock: { aiAllowance: 0 } })
    await user.click(await screen.findByRole('button', { name: 'Read this page with AI' }))
    expect(await screen.findByText(/used your AI allowance/)).toBeTruthy()
    // What the server could read without the model is still filled in
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveProperty('value', 'Example-news')
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveProperty('value', '')
  })

  it('keeps the allowance message on a page it read well, where the button sits below the form', async () => {
    const { user } = setup({ mock: { aiAllowance: 0 } })
    await user.click(await screen.findByRole('button', { name: 'Read this page with AI' }))
    expect(await screen.findByText(/used your AI allowance/)).toBeTruthy()
  })
})
