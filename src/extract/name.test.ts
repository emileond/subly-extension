import { describe, expect, it } from 'vitest'
import { brandFromHost, brandLabel, cleanBrand, segmentMatchingHost, titleSegments } from './name'

describe('brand from the host', () => {
  it.each([
    ['www.netflix.com', 'netflix', 'Netflix'],
    ['app.notion.so', 'notion', 'Notion'],
    ['www.bbc.co.uk', 'bbc', 'Bbc'],
    ['my-service.io', 'my-service', 'My Service'],
    ['localhost', 'localhost', 'Localhost'],
  ])('%s', (host, label, name) => {
    expect(brandLabel(host)).toBe(label)
    expect(brandFromHost(host)).toBe(name)
  })

  it('has no brand for an IP address', () => {
    expect(brandFromHost('192.168.0.1')).toBe('')
  })
})

describe('titles', () => {
  it.each([
    ['Pricing | Notion', 'notion.so', 'Notion'],
    ['Notion – The all-in-one workspace', 'www.notion.so', 'Notion'],
    ['Plans & Pricing - Tasklane', 'tasklane.io', 'Tasklane'],
    ['Spotify Premium Plans', 'spotify.com', 'Spotify'],
    ['Planes y precios - Cuentas Claras', 'cuentasclaras.com.mx', 'Cuentas Claras'],
  ])('%s -> %s', (title, host, expected) => {
    expect(segmentMatchingHost(titleSegments(title), host)).toBe(expected)
  })

  it('drops pages that only say what they are', () => {
    expect(titleSegments('Pricing')).toEqual([])
    expect(titleSegments('Home | Plans & Pricing')).toEqual([])
  })
})

describe('cleanBrand', () => {
  it('keeps a real brand and cleans a decorated one', () => {
    expect(cleanBrand('Paperly', 'paperly.com')).toBe('Paperly')
    expect(cleanBrand('Paperly | Notes for teams', 'paperly.com')).toBe('Paperly')
    expect(cleanBrand('Pricing', 'paperly.com')).toBe('')
    expect(cleanBrand(undefined, 'paperly.com')).toBe('')
    expect(cleanBrand('x'.repeat(80), 'paperly.com')).toBe('')
  })
})
