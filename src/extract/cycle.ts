import type { Range, Trial } from './types'

export interface Cycle {
  freq: number
  range: Range
  /** Where in the scanned text it was found */
  index: number
}

const MONTH = String.raw`(?:months?|mo\.?|mes(?:es)?|mois|monats?|monate[n]?|mese|mesi|maand(?:en)?|mês|meses)`
const YEAR = String.raw`(?:years?|yr\.?|año|años|ans?|année|années|jahr(?:e|en)?|ano|anos|anno|anni|jaar|jaren)`
const WEEK = String.raw`(?:weeks?|wk\.?|semanas?|semaines?|wochen?|settimane?|settimana|weken|week)`
const DAY = String.raw`(?:days?|días?|dias?|jours?|tage[n]?|tag|giorni|giorno|dagen)`

const UNIT_WORDS: [RegExp, Range][] = [
  [new RegExp(`^${MONTH}$`, 'i'), 'month'],
  [new RegExp(`^${YEAR}$`, 'i'), 'year'],
  [new RegExp(`^${WEEK}$`, 'i'), 'week'],
  [new RegExp(`^${DAY}$`, 'i'), 'day'],
]

export function unitFromWord(word: string): Range | null {
  const w = word.trim()
  for (const [pattern, range] of UNIT_WORDS) if (pattern.test(w)) return range
  return null
}

const SEAT = String.raw`(?:(?:user|seat|member|editor|usuario|utilisateur|nutzer|benutzer|mitglied)\s*(?:/|per|por|par|pro|a)\s*)?`
const PER = String.raw`(?:per|par|por|pro|pour|a|al|au|im|each|every|alle|ogni|cada|elke|tous les|toutes les|all['’])`

interface Pattern {
  re: RegExp
  /** freq, range or a function of the match */
  read: (m: RegExpExecArray) => { freq: number; range: Range } | null
}

const fixed = (freq: number, range: Range) => () => ({ freq, range })

const PATTERNS: Pattern[] = [
  // "every 3 months", "cada 2 semanas", "tous les 3 mois"
  {
    re: new RegExp(String.raw`\b(?:every|each|alle|cada|tous les|toutes les|ogni|elke|all['’]?|billed every|charged every)\s+(\d{1,2})\s*(${MONTH}|${YEAR}|${WEEK}|${DAY})\b`, 'i'),
    read: (m) => {
      const range = unitFromWord(m[2])
      return range ? { freq: Number(m[1]), range } : null
    },
  },
  // "/mo", "/ month", "/user/month", "/yr", "/año"
  { re: new RegExp(String.raw`/\s*${SEAT}${MONTH}(?![a-zà-ÿ])`, 'i'), read: fixed(1, 'month') },
  { re: new RegExp(String.raw`/\s*${SEAT}${YEAR}(?![a-zà-ÿ])`, 'i'), read: fixed(1, 'year') },
  { re: new RegExp(String.raw`/\s*${SEAT}${WEEK}(?![a-zà-ÿ])`, 'i'), read: fixed(1, 'week') },
  { re: new RegExp(String.raw`/\s*${SEAT}${DAY}(?![a-zà-ÿ])`, 'i'), read: fixed(1, 'day') },
  // "per month", "a month", "al mes", "par mois", "pro Monat", "per user per month"
  { re: new RegExp(String.raw`\b${PER}\s+${SEAT}(?:${PER}\s+)?${MONTH}(?![a-zà-ÿ])`, 'i'), read: fixed(1, 'month') },
  { re: new RegExp(String.raw`\b${PER}\s+${SEAT}(?:${PER}\s+)?${YEAR}(?![a-zà-ÿ])`, 'i'), read: fixed(1, 'year') },
  { re: new RegExp(String.raw`\b${PER}\s+${SEAT}(?:${PER}\s+)?${WEEK}(?![a-zà-ÿ])`, 'i'), read: fixed(1, 'week') },
  { re: new RegExp(String.raw`\b${PER}\s+${SEAT}(?:${PER}\s+)?${DAY}(?![a-zà-ÿ])`, 'i'), read: fixed(1, 'day') },
  // adjectives
  { re: /\b(?:monthly|mensual(?:es)?|mensuel(?:le)?s?|monatlich|mensal|mensile|maandelijks|mes a mes)\b/i, read: fixed(1, 'month') },
  { re: /\b(?:yearly|annual(?:ly)?|anual(?:mente|es)?|annuel(?:le|lement)?s?|jährlich|annuale|annualmente|jaarlijks)\b/i, read: fixed(1, 'year') },
  { re: /\b(?:weekly|semanal(?:es)?|hebdomadaire|wöchentlich|settimanale|wekelijks)\b/i, read: fixed(1, 'week') },
  { re: /\b(?:daily|diari[oa]|quotidien(?:ne)?|täglich|giornaliero)\b/i, read: fixed(1, 'day') },
  { re: /\b(?:quarterly|trimestral(?:es)?|trimestriel(?:le)?|vierteljährlich|trimestrale)\b/i, read: fixed(3, 'month') },
  { re: /\b(?:semi-?annual(?:ly)?|biannual(?:ly)?|semestral|halbjährlich)\b/i, read: fixed(6, 'month') },
]

/** The renewal period written in `text`, the earliest one, e.g. "/mo", "per year", "every 3 months", "billed monthly" */
export function detectCycle(text: string): Cycle | null {
  let best: Cycle | null = null
  for (const { re, read } of PATTERNS) {
    const m = re.exec(text)
    if (!m) continue
    // "No monthly fees" describes what the price is not
    if (/\b(?:no|zero|without|sin|keine|kein|pas de|sans|nessun[ao]?)\s+$/i.test(text.slice(Math.max(0, m.index - 12), m.index))) continue
    const value = read(m)
    if (value && (!best || m.index < best.index)) best = { ...value, index: m.index }
  }
  return best
}

const BILLED_ANNUALLY =
  /\b(?:billed|paid|charged|payable|facturad[oa]s?|cobrad[oa]s?|facturé|abgerechnet|fatturat[oa])\s+(?:as\s+)?(?:annually|yearly|once a year|anualmente|cada año|annuellement|jährlich|annualmente)|\b(?:annual|yearly) (?:billing|plan)\b|\bfacturación anual\b|\bannual\s+commitment\b/i

export function isBilledAnnually(text: string): boolean {
  return BILLED_ANNUALLY.test(text)
}

const ONE_TIME =
  /\b(?:one[- ]time(?: payment| purchase| fee| price)?|lifetime(?: deal| access| license| plan)?|pay once|single payment|pago [uú]nico|una sola vez|einmalig|einmalzahlung|paiement unique|achat unique|pagamento [uú]nico|pagamento unico|eenmalig)\b/i

export const isOneTime = (text: string) => ONE_TIME.test(text)

const TRIAL_WORDS = String.raw`(?:free[- ]trial|trial|prueba(?: gratuita| gratis)?|essai(?: gratuit)?|testphase|probezeit|teste? grátis|prova(?: gratuita)?|proefperiode)`

/** "7-day free trial", "try free for 14 days", "prueba gratuita de 30 días", "free trial" (length unknown -> null range) */
export function detectTrial(text: string): { found: boolean; trial: Trial | null } {
  const before = new RegExp(String.raw`\b(\d{1,3})[- ]?[ \t]*(${DAY}|${WEEK}|${MONTH})[ \t]*(?:de |d['’]|of |free )?${TRIAL_WORDS}`, 'i').exec(text)
  const after = new RegExp(String.raw`${TRIAL_WORDS}[ \t]*(?:de |for |of |: |- |– )?[ \t]*(\d{1,3})[- ]?[ \t]*(${DAY}|${WEEK}|${MONTH})\b`, 'i').exec(text)
  const tryFree = /\b(?:try|test|start)\b[^.\n]{0,24}\b(?:free|gratis|gratuit\w*|kostenlos|grátis)\b[^.\n]{0,24}?\b(?:for\s+)?(\d{1,3})[- ]?\s*(days?|weeks?|months?|días|dias|jours|tage|tagen)\b/i.exec(text)
  const m = before ?? after ?? tryFree
  if (m) {
    const range = unitFromWord(m[2])
    if (range) return { found: true, trial: { freq: Number(m[1]), range } }
  }
  const any = new RegExp(String.raw`\bfree[- ]trial\b|\bprueba (?:gratuita|gratis)\b|\bessai gratuit\b|\bkostenlos testen\b|\bteste? grátis\b|\bprova gratuita\b`, 'i')
  return { found: any.test(text), trial: null }
}
