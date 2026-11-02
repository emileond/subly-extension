import type { AddItemRequest, ExtensionContext, Suggestion } from '../api/types'
import { isDateInput } from '../lib/date'
import { matchCategory, suggestNextCharge } from '../extract/extract'
import { parseNumber } from '../extract/price'
import type { Extraction, PlanCandidate, Range } from '../extract/types'

/** The form's values, all as the inputs hold them (strings) */
export interface FormValues {
  name: string
  amount: string
  currency: string
  freq: string
  /** 'once' is a payment that does not renew */
  range: Range | 'once'
  date: string
  category: string
  projectId: string
  paymentMethodId: string
  tagIds: number[]
  notes: string
  website: string
  logo: string
}

export type FieldName = keyof FormValues

export const PLAN_FIELDS: FieldName[] = ['amount', 'currency', 'freq', 'range', 'date']

const planNote = (extraction: Extraction, plan: PlanCandidate | null) =>
  plan && plan.label && extraction.plans.length > 1 ? `Plan: ${plan.label}` : ''

/** Values taken from a plan: what it costs, how often, and when the first charge probably is */
export function valuesFromPlan(
  extraction: Extraction,
  plan: PlanCandidate | null,
  ctx: ExtensionContext,
  today: Date
): Pick<FormValues, 'amount' | 'currency' | 'freq' | 'range' | 'date'> {
  return {
    amount: plan ? String(plan.amount) : '',
    currency: plan?.currency ?? ctx.workspace.baseCurrency,
    freq: String(plan?.billingFreq ?? 1),
    range: plan?.oneTime ? 'once' : (plan?.billingRange ?? 'month'),
    date: suggestNextCharge(plan, extraction.trial, today),
  }
}

export function initialValues(extraction: Extraction, ctx: ExtensionContext, today: Date): FormValues {
  const plan = extraction.selected >= 0 ? extraction.plans[extraction.selected] : null
  return {
    name: extraction.name,
    ...valuesFromPlan(extraction, plan, ctx, today),
    category: matchCategory(extraction.categoryHint, ctx.categories),
    projectId: '',
    paymentMethodId: '',
    tagIds: [],
    notes: planNote(extraction, plan),
    website: extraction.website,
    logo: extraction.logo,
  }
}

/** The server's reading of the page, on top of the fields the person has not edited */
export function applySuggestion(values: FormValues, suggestion: Suggestion, ctx: ExtensionContext, skip: Set<FieldName>, today: Date): FormValues {
  const next = { ...values }
  const set = <K extends FieldName>(field: K, value: FormValues[K]) => {
    if (!skip.has(field)) next[field] = value
  }
  if (suggestion.name) set('name', suggestion.name)
  const priced = suggestion.amount !== null && suggestion.amount > 0
  if (priced) set('amount', String(suggestion.amount))
  if (suggestion.currency) set('currency', suggestion.currency.toUpperCase())
  if (suggestion.billingFreq > 0) set('freq', String(suggestion.billingFreq))
  if (suggestion.billingRange) set('range', suggestion.billingRange)
  const category = matchCategory(suggestion.category ?? '', ctx.categories)
  if (category) set('category', category)
  // The server answers a bare domain (linear.app); the form holds an address
  if (suggestion.website) set('website', /^https?:\/\//i.test(suggestion.website) ? suggestion.website : `https://${suggestion.website}`)
  if (!skip.has('date') && priced) {
    next.date = suggestNextCharge(
      { billingFreq: suggestion.billingFreq, billingRange: suggestion.billingRange, oneTime: false },
      null,
      today
    )
  }
  return next
}

export type FormErrors = Partial<Record<'name' | 'amount' | 'freq' | 'date' | 'website', string>>

export function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {}
  if (!values.name.trim()) errors.name = 'Enter a name.'
  const amount = parseNumber(values.amount.trim())
  if (amount === null || amount <= 0) errors.amount = 'Enter the amount it costs.'
  if (values.range !== 'once') {
    const freq = Number(values.freq)
    if (!Number.isInteger(freq) || freq < 1 || freq > 36) errors.freq = 'Use a whole number from 1 to 36.'
  }
  if (!isDateInput(values.date)) errors.date = 'Pick a date.'
  if (values.website.trim() && !/^https?:\/\/\S+$/i.test(values.website.trim())) errors.website = 'Start the address with https://'
  return errors
}

/** The request body for POST /api/extension/items. Call only with values that pass validate() */
export function toRequest(values: FormValues, workspaceId: number, force: boolean): AddItemRequest {
  const recurring = values.range !== 'once'
  const projectId = Number(values.projectId)
  const paymentMethodId = Number(values.paymentMethodId)
  return {
    workspaceId,
    ...(force ? { force: true } : {}),
    item: {
      name: values.name.trim(),
      direction: 'out',
      amount: parseNumber(values.amount.trim()) ?? 0,
      currency: values.currency.toUpperCase(),
      isRecurring: recurring,
      ...(recurring ? { billingFreq: Number(values.freq), billingRange: values.range as Range } : {}),
      nextChargeDate: values.date,
      category: values.category || null,
      website: values.website.trim() || null,
      notes: values.notes.trim() || null,
      projectId: projectId || null,
      tagIds: values.tagIds,
      paymentMethodId: paymentMethodId || null,
      logo: values.logo || null,
    },
  }
}
