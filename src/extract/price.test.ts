import { describe, expect, it } from 'vitest'
import { findMoney, parseNumber, parsePriceValue } from './price'

const en = { lang: 'en', host: 'example.com' }
const money = (text: string, hints = en) =>
  findMoney(text, hints).map((m) => `${m.amount} ${m.currency}`)

describe('parseNumber', () => {
  it.each([
    ['9.99', 9.99],
    ['9,99', 9.99],
    ['1,200', 1200],
    ['1.200', 1200],
    ['1.299,00', 1299],
    ['1,299.00', 1299.0],
    ['1 299,00', 1299],
    ["1'200.50", 1200.5],
    ['12', 12],
    ['0,500', 0.5],
    ['1,234,567', 1234567],
  ])('%s -> %s', (input, expected) => {
    expect(parseNumber(input)).toBe(expected)
  })

  it('rejects text', () => {
    expect(parseNumber('abc')).toBeNull()
    expect(parseNumber('')).toBeNull()
  })
})

describe('findMoney', () => {
  it.each([
    ['$9.99', '9.99 USD'],
    ['9,99 €', '9.99 EUR'],
    ['9,99€', '9.99 EUR'],
    ['USD 12 / month', '12 USD'],
    ['12 USD', '12 USD'],
    ['£5/mo', '5 GBP'],
    ['¥1,200', '1200 JPY'],
    ['CHF 8', '8 CHF'],
    ['R$ 29,90', '29.9 BRL'],
    ['€ 1.299,00', '1299 EUR'],
    ['US$12', '12 USD'],
    ['CA$15', '15 CAD'],
    ['A$20', '20 AUD'],
    ['29 zł', '29 PLN'],
    ['₹499', '499 INR'],
    ['$9.99 USD', '9.99 USD'],
    ['$9.99 CAD', '9.99 CAD'],
  ])('%s -> %s', (text, expected) => {
    expect(money(text)).toEqual([expected])
  })

  it('reads several prices in order', () => {
    expect(money('Starter $9 /month · Pro $29 /month')).toEqual(['9 USD', '29 USD'])
  })

  it('leaves out discounts and credits', () => {
    expect(money('Save $20 when you pay yearly')).toEqual([])
    expect(money('$10 off your first month')).toEqual([])
    expect(money('Pro $29/mo (was $39)')).toEqual(['29 USD'])
  })

  it('resolves $ and ¥ from the page language and country', () => {
    expect(money('$199', { lang: 'es-MX', host: 'cuentas.mx' })).toEqual(['199 MXN'])
    expect(money('$15', { lang: 'en', host: 'shop.ca' })).toEqual(['15 CAD'])
    expect(money('¥1,200', { lang: 'ja', host: 'example.jp' })).toEqual(['1200 JPY'])
    expect(money('¥99', { lang: 'zh-CN', host: 'example.cn' })).toEqual(['99 CNY'])
    expect(money('99 kr', { lang: 'sv', host: 'example.se' })).toEqual(['99 SEK'])
  })

  it('does not name a currency for an unclear kr', () => {
    expect(money('99 kr', en)).toEqual(['99 null'])
  })

  it('ignores plain numbers', () => {
    expect(money('Over 10,000 teams in 2024 trust us')).toEqual([])
  })
})

describe('parsePriceValue', () => {
  it('reads numbers, numeric strings and strings with a symbol', () => {
    expect(parsePriceValue(9.99, en)).toEqual({ amount: 9.99, currency: null })
    expect(parsePriceValue('9.99', en)).toEqual({ amount: 9.99, currency: null })
    expect(parsePriceValue('9,99', en)).toEqual({ amount: 9.99, currency: null })
    expect(parsePriceValue('$9.99', en)).toEqual({ amount: 9.99, currency: 'USD' })
    expect(parsePriceValue(undefined, en)).toBeNull()
    expect(parsePriceValue('free', en)).toBeNull()
  })
})
