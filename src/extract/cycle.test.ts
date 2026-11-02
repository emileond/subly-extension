import { describe, expect, it } from 'vitest'
import { detectCycle, detectTrial, isBilledAnnually, isOneTime } from './cycle'

const cycle = (text: string) => {
  const c = detectCycle(text)
  return c ? `${c.freq} ${c.range}` : null
}

describe('detectCycle', () => {
  it.each([
    ['/mo', '1 month'],
    ['£5/mo', '1 month'],
    ['USD 12 / month', '1 month'],
    ['$8 per user/month', '1 month'],
    ['$8 per user per month', '1 month'],
    ['$12 a month', '1 month'],
    ['Billed monthly', '1 month'],
    ['/yr', '1 year'],
    ['$99/year', '1 year'],
    ['per year', '1 year'],
    ['Billed annually', '1 year'],
    ['yearly', '1 year'],
    ['every 3 months', '3 month'],
    ['billed every 2 weeks', '2 week'],
    ['weekly', '1 week'],
    ['/wk', '1 week'],
    ['per day', '1 day'],
    ['quarterly', '3 month'],
    ['199 al mes', '1 month'],
    ['349 / mes', '1 month'],
    ['al año', '1 year'],
    ['9,99 € pro Monat', '1 month'],
    ['99,90 € pro Jahr', '1 year'],
    ['9,99 € par mois', '1 month'],
    ['por mês', '1 month'],
    ['cada 3 meses', '3 month'],
  ])('%s -> %s', (text, expected) => {
    expect(cycle(text)).toBe(expected)
  })

  it('takes the earliest period in the text', () => {
    expect(cycle('/month, billed annually')).toBe('1 month')
  })

  it('does not read ordinary words as a period', () => {
    expect(cycle('An amazing moment for a team of any size')).toBeNull()
    expect(cycle('Pay later with Klarna')).toBeNull()
  })
})

describe('billed annually, one-time and trials', () => {
  it('knows when a monthly price is billed yearly', () => {
    expect(isBilledAnnually('$8 /month billed annually')).toBe(true)
    expect(isBilledAnnually('$10 /month billed monthly')).toBe(false)
  })

  it('knows one-time prices', () => {
    expect(isOneTime('$59 one-time payment')).toBe(true)
    expect(isOneTime('Lifetime deal')).toBe(true)
    expect(isOneTime('$9/month')).toBe(false)
  })

  it.each([
    ['Start your 7-day free trial', { freq: 7, range: 'day' }],
    ['14 day free trial, cancel anytime', { freq: 14, range: 'day' }],
    ['Try it free for 30 days', { freq: 30, range: 'day' }],
    ['Free trial: 2 weeks', { freq: 2, range: 'week' }],
    ['Prueba gratuita de 30 días', { freq: 30, range: 'day' }],
    ['1 month free trial', { freq: 1, range: 'month' }],
  ])('%s', (text, trial) => {
    expect(detectTrial(text)).toEqual({ found: true, trial })
  })

  it('finds a trial whose length is not given', () => {
    expect(detectTrial('Start your free trial')).toEqual({ found: true, trial: null })
    expect(detectTrial('Subscribe today')).toEqual({ found: false, trial: null })
  })
})
