import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown, Globe, LoaderCircle, Plus } from 'lucide-react'
import { ApiError, type ExtensionContext, type Suggestion } from '../api/types'
import type { Deps } from '../deps'
import type { Extraction } from '../extract/types'
import type { PageRead } from '../page/readPage'
import { AiAssist } from './AiAssist'
import { parseNumber } from '../extract/price'
import { shownLogo } from '../lib/logo'
import { currencyOptions, cycleLabel, formatMoney } from './format'
import {
  PLAN_FIELDS,
  applySuggestion,
  initialValues,
  toRequest,
  valuesFromPlan,
  validate,
  type FieldName,
  type FormErrors,
  type FormValues,
} from './form'
import { Callout, ServiceLogo } from './kit'
import { Notes } from './Notes'
import { PlanPicker } from './PlanPicker'

interface Props {
  deps: Deps
  ctx: ExtensionContext
  page: PageRead
  extraction: Extraction | null
  onSignedOut: (message: string) => void
}

type Outcome =
  | { kind: 'none' }
  | { kind: 'created'; name: string; url: string; values: FormValues }
  | { kind: 'duplicate'; id: number; name: string }
  | { kind: 'error'; message: string }

const EMPTY: Extraction = {
  name: '', website: '', logo: '', categoryHint: '', plans: [], selected: -1, confidence: 'none', trial: null, trialMentioned: false,
}

function Field({ label, error, children, hint }: { label: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="field">
      <label className="field">
        <span className="label">{label}</span>
        {children}
      </label>
      {hint && <span className="hint">{hint}</span>}
      {error && (
        <span className="error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

export function AddItem({ deps, ctx, page, extraction: found, onSignedOut }: Props) {
  const extraction = found ?? EMPTY
  const today = useMemo(() => new Date(), [])
  const [values, setValues] = useState<FormValues>(() => initialValues(extraction, ctx, today))
  const [selectedPlan, setSelectedPlan] = useState(extraction.selected)
  const [errors, setErrors] = useState<FormErrors>({})
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'none' })
  const [saving, setSaving] = useState(false)
  const [aiApplied, setAiApplied] = useState(false)
  const edited = useRef(new Set<FieldName>())
  const formRef = useRef<HTMLFormElement>(null)
  const resultRef = useRef<HTMLHeadingElement>(null)

  const plan = selectedPlan >= 0 ? (extraction.plans[selectedPlan] ?? null) : null
  const snapshot = page.status === 'ok' ? page.snapshot : null

  // A different workspace has its own projects, payment methods and tags, and its own base currency
  const workspaceId = ctx.workspace.id
  const lastWorkspace = useRef(workspaceId)
  useEffect(() => {
    if (lastWorkspace.current === workspaceId) return
    lastWorkspace.current = workspaceId
    setValues((v) => ({
      ...v,
      projectId: '',
      paymentMethodId: '',
      tagIds: [],
      category: ctx.categories.includes(v.category) ? v.category : '',
      currency: plan?.currency || edited.current.has('currency') ? v.currency : ctx.workspace.baseCurrency,
    }))
  }, [workspaceId, ctx, plan])

  const messageRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (outcome.kind === 'created') resultRef.current?.focus()
    // The form is taller than the popup: bring a duplicate warning or an error into view
    if (outcome.kind === 'duplicate' || outcome.kind === 'error') messageRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [outcome])

  // The logo follows the website once typing pauses, so logo.dev never sees half-typed domains
  const logoSite = useSettled(values.website, 500)

  function update<K extends FieldName>(field: K, value: FormValues[K]) {
    edited.current.add(field)
    setValues((v) => ({ ...v, [field]: value }))
    setErrors((e) => (field in e ? { ...e, [field]: undefined } : e))
    if (outcome.kind === 'duplicate' || outcome.kind === 'error') setOutcome({ kind: 'none' })
  }

  function choosePlan(index: number) {
    setSelectedPlan(index)
    const chosen = extraction.plans[index] ?? null
    PLAN_FIELDS.forEach((f) => edited.current.delete(f))
    setValues((v) => ({
      ...v,
      ...valuesFromPlan(extraction, chosen, ctx, today),
      notes: edited.current.has('notes') ? v.notes : chosen?.label ? `Plan: ${chosen.label}` : '',
    }))
    setAiApplied(false)
  }

  function onSuggestion(suggestion: Suggestion, byAi = true) {
    setValues((v) => applySuggestion(v, suggestion, ctx, edited.current, today))
    setSelectedPlan(-1)
    setAiApplied(byAi)
  }

  function changeRange(range: FormValues['range']) {
    update('range', range)
    // The suggested date follows the cycle until the person picks one
    if (!edited.current.has('date')) {
      const next = valuesFromPlan(
        { ...extraction, trial: null },
        { billingFreq: Number(values.freq) || 1, billingRange: range === 'once' ? null : range, oneTime: range === 'once' } as never,
        ctx,
        today
      )
      setValues((v) => ({ ...v, range, date: next.date }))
    }
  }

  async function save(force: boolean) {
    const found = validate(values)
    setErrors(found)
    const first = Object.keys(found)[0]
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    setSaving(true)
    setOutcome({ kind: 'none' })
    try {
      const result = await deps.api.addItem(toRequest(values, ctx.workspace.id, force))
      if (result.kind === 'duplicate') {
        setOutcome({ kind: 'duplicate', id: result.duplicateOf.id, name: result.duplicateOf.name })
      } else {
        setOutcome({ kind: 'created', name: values.name.trim(), url: result.url, values })
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === 'unauthorized') return onSignedOut(error.message)
      setOutcome({ kind: 'error', message: error instanceof Error ? error.message : 'Something went wrong.' })
    } finally {
      setSaving(false)
    }
  }

  function addAnother() {
    edited.current.clear()
    setValues(initialValues(extraction, ctx, new Date()))
    setSelectedPlan(extraction.selected)
    setAiApplied(false)
    setErrors({})
    setOutcome({ kind: 'none' })
  }

  if (outcome.kind === 'created') {
    const { values: added } = outcome
    const amount = parseNumber(added.amount)
    const once = added.range === 'once'
    return (
      <section className="done" aria-live="polite">
        <span className="done-mark" aria-hidden="true">
          <Check size={22} strokeWidth={2.5} />
        </span>
        <div style={{ display: 'grid', gap: 4 }}>
          <h1 ref={resultRef} tabIndex={-1} className="display">
            Added to Subly
          </h1>
          <p className="muted">
            <strong style={{ color: 'var(--foreground)' }}>{outcome.name}</strong> is now in {ctx.workspace.name}.
          </p>
        </div>
        <div className="summary">
          <ServiceLogo src={shownLogo(added.website, added.logo)} name={added.name} large />
          <div className="what">
            <span className="name">{added.name.trim()}</span>
            {added.date && (
              <span className="small muted">
                {once ? 'Charged' : 'Next charge'} {formatDate(added.date)}
              </span>
            )}
          </div>
          {amount !== null && (
            <div className="price">
              {formatMoney(amount, added.currency)}
              <div className="small muted" style={{ fontWeight: 400 }}>
                {once ? 'one-time' : cycleLabel(Number(added.freq) || 1, added.range)}
              </div>
            </div>
          )}
        </div>
        <div className="actions">
          {outcome.url ? (
            <a className="button primary" href={outcome.url} target="_blank" rel="noreferrer">
              Open in Subly
            </a>
          ) : (
            <span />
          )}
          <button type="button" className="button outline" onClick={addAnother}>
            <Plus size={14} aria-hidden="true" />
            Add another
          </button>
        </div>
      </section>
    )
  }

  const currencies = currencyOptions([values.currency, ctx.workspace.baseCurrency])
  const weak = !plan || plan.confidence === 'low'
  // Placed by the first reading, so the card never moves (and loses its message) once it fills the form in
  const aiFirst = extraction.selected < 0 || extraction.plans[extraction.selected]?.confidence === 'low'
  const oneTime = values.range === 'once'
  const freq = Number(values.freq) || 1
  const unit = (name: string) => (freq > 1 ? `${name}s` : name)
  const host = hostOf(values.website)

  // A weak reading puts the AI right under the notice: it is the quickest way to a filled form
  const ai = snapshot && (
    <AiAssist
      api={deps.api}
      snapshot={snapshot}
      workspaceId={ctx.workspace.id}
      weak={weak}
      onSuggestion={onSuggestion}
      onAllowanceSpent={(suggestion) => {
        if (suggestion) onSuggestion(suggestion, false)
      }}
      onSignedOut={onSignedOut}
    />
  )

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void save(false)
      }}
    >
      <div className="body">
        {!ctx.canAdd && (
          <Callout tone="attention" role="alert">
            <span>
              <strong>You can’t add more right now.</strong>{' '}
              {ctx.limitReason === 'item_limit' || !ctx.limitReason ? 'Your plan’s item limit is reached.' : ctx.limitReason}{' '}
              <a href={`${deps.baseUrl}/plans`} target="_blank" rel="noreferrer">
                See plans
              </a>
            </span>
          </Callout>
        )}

        <Notes
          extraction={extraction}
          plan={plan}
          workspaceCurrency={ctx.workspace.baseCurrency}
          unreadable={page.status === 'unreadable'}
          aiApplied={aiApplied}
        />

        {aiFirst && ai}

        {extraction.plans.length > 1 && (
          <PlanPicker plans={extraction.plans} selected={selectedPlan} fallbackCurrency={ctx.workspace.baseCurrency} onSelect={choosePlan} />
        )}

        <Field
          label="Name"
          error={errors.name}
          hint={
            host ? (
              <>
                <Globe size={12} aria-hidden="true" />
                <span>{host}</span>
              </>
            ) : undefined
          }
        >
          <div className="with-logo">
            <ServiceLogo src={shownLogo(logoSite, values.logo)} name={values.name} />
            <input
              name="name"
              value={values.name}
              onChange={(e) => update('name', e.target.value)}
              aria-invalid={Boolean(errors.name)}
              placeholder="What is it called?"
              autoComplete="off"
            />
          </div>
        </Field>

        <div className="row">
          <Field label="Amount" error={errors.amount}>
            <input
              name="amount"
              className="amount"
              inputMode="decimal"
              value={values.amount}
              onChange={(e) => update('amount', e.target.value)}
              aria-invalid={Boolean(errors.amount)}
              placeholder="0.00"
              autoComplete="off"
            />
          </Field>
          <Field label="Currency">
            <select name="currency" value={values.currency} onChange={(e) => update('currency', e.target.value)}>
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="row">
          {oneTime ? (
            <Field label="Billing">
              <select name="range" value={values.range} onChange={(e) => changeRange(e.target.value as FormValues['range'])}>
                <RangeOptions unit={unit} />
              </select>
            </Field>
          ) : (
            <div className="field">
              <label className="label" htmlFor="freq">
                Renews every
              </label>
              <div className="group">
                <input
                  id="freq"
                  name="freq"
                  className="freq"
                  type="number"
                  min={1}
                  max={36}
                  value={values.freq}
                  onChange={(e) => update('freq', e.target.value)}
                  aria-invalid={Boolean(errors.freq)}
                />
                <select
                  name="range"
                  aria-label="Period"
                  value={values.range}
                  onChange={(e) => changeRange(e.target.value as FormValues['range'])}
                >
                  <RangeOptions unit={unit} />
                </select>
              </div>
              {errors.freq && (
                <span className="error" role="alert">
                  {errors.freq}
                </span>
              )}
            </div>
          )}
          <Field label={oneTime ? 'Charge date' : 'Next charge'} error={errors.date}>
            <input name="date" type="date" value={values.date} onChange={(e) => update('date', e.target.value)} aria-invalid={Boolean(errors.date)} />
          </Field>
        </div>

        <div className="row">
          <Field label="Category">
            <select name="category" value={values.category} onChange={(e) => update('category', e.target.value)}>
              <option value="">Choose one</option>
              {ctx.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Project">
            <select name="projectId" value={values.projectId} onChange={(e) => update('projectId', e.target.value)}>
              <option value="">No project</option>
              {ctx.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <details className="disclosure">
          <summary>
            More details
            <ChevronDown size={13} aria-hidden="true" />
          </summary>
          <div className="inner">
            {ctx.paymentMethods.length > 0 && (
              <Field label="Payment method">
                <select name="paymentMethodId" value={values.paymentMethodId} onChange={(e) => update('paymentMethodId', e.target.value)}>
                  <option value="">None</option>
                  {ctx.paymentMethods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {ctx.tags.length > 0 && (
              <fieldset className="field">
                <legend className="label" style={{ marginBottom: 6 }}>
                  Tags
                </legend>
                <div className="tags">
                  {ctx.tags.map((tag) => {
                    const on = values.tagIds.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className={`chip${on ? ' on' : ''}`}
                        aria-pressed={on}
                        onClick={() => update('tagIds', on ? values.tagIds.filter((id) => id !== tag.id) : [...values.tagIds, tag.id])}
                      >
                        {tag.name}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            )}
            <Field label="Website" error={errors.website}>
              <input name="website" type="url" value={values.website} onChange={(e) => update('website', e.target.value)} placeholder="https://" />
            </Field>
            <Field label="Notes">
              <textarea name="notes" rows={2} value={values.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Anything worth remembering" />
            </Field>
          </div>
        </details>

        {!aiFirst && ai}
      </div>

      <div className="footer">
        {outcome.kind === 'duplicate' && (
          <Callout tone="attention" role="alert" ref={messageRef}>
            <p>
              <strong>Already in Subly:</strong> {outcome.name}.{' '}
              <a href={`${deps.baseUrl}/recurring/${outcome.id}`} target="_blank" rel="noreferrer">
                View it
              </a>
            </p>
            <div className="actions">
              <button type="button" className="button outline sm" disabled={saving} onClick={() => void save(true)}>
                Add anyway
              </button>
            </div>
          </Callout>
        )}
        {outcome.kind === 'error' && (
          <Callout tone="problem" role="alert" ref={messageRef}>
            {outcome.message}
          </Callout>
        )}
        <button type="submit" className="button primary lg wide" disabled={saving || !ctx.canAdd}>
          {saving && <LoaderCircle size={15} className="spin" aria-hidden="true" />}
          {saving ? 'Adding…' : 'Add to Subly'}
        </button>
      </div>
    </form>
  )
}

function RangeOptions({ unit }: { unit: (name: string) => string }) {
  return (
    <>
      <option value="day">{unit('day')}</option>
      <option value="week">{unit('week')}</option>
      <option value="month">{unit('month')}</option>
      <option value="year">{unit('year')}</option>
      <option value="once">One-time payment</option>
    </>
  )
}

/** "notion.so" from "https://www.notion.so/pricing" */
function hostOf(website: string): string {
  try {
    return new URL(website).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** "Nov 30, 2026" from the date input's YYYY-MM-DD, in the person's own time zone */
function formatDate(value: string): string {
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return value
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(y, m - 1, d))
}

/** `value` once it has stopped changing for `ms` */
function useSettled<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return settled
}
