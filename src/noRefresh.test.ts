import { describe, expect, it } from 'vitest'

// The extension has its own token: it never renews anything and never talks to Supabase
const sources = import.meta.glob(['./**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>

describe('no Supabase session left', () => {
  it('has source files to look at', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(20)
  })

  it.each(['/auth/v1', 'grant_type', 'refresh_token', 'refreshToken', 'access_token', 'supabase', 'SET_SESSION', 'anon_key'])('does not mention %s', (word) => {
    const hits = Object.entries(sources).filter(([, text]) => text.toLowerCase().includes(word.toLowerCase())).map(([file]) => file)
    expect(hits).toEqual([])
  })
})
