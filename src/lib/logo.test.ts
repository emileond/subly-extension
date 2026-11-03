import { describe, expect, it } from 'vitest'
import { logoUrl, shownLogo } from './logo'

describe('logo', () => {
  it('builds the logo.dev address the server builds, from the bare domain', () => {
    expect(logoUrl('https://www.notion.so/pricing?plan=plus#faq')).toMatch(/^https:\/\/img\.logo\.dev\/notion\.so\?token=pk_\w+$/)
    expect(logoUrl('linear.app')).toContain('img.logo.dev/linear.app?')
    expect(logoUrl('  ')).toBe('')
  })

  it('falls back to the page icon only when there is no website', () => {
    expect(shownLogo('https://figma.com', 'https://figma.com/icon.png')).toContain('img.logo.dev/figma.com')
    expect(shownLogo('', 'https://figma.com/icon.png')).toBe('https://figma.com/icon.png')
  })
})
