import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, type ExtensionContext, type Suggestion } from '../api/types'
import type { Deps } from '../deps'
import type { Extraction } from '../extract/types'
import type { PageRead } from '../page/readPage'
import { AiAssist } from './AiAssist'
import { currencyOptions } from './format'
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
import { Notes } from './Notes'
import { PlanPicker } from './PlanPicker'

interface Props {
  deps: Deps
  ctx: ExtensionContext
  page: PageRead
  extraction: Extraction | null
  onSignedOut: () => void
}

type Outcome =
  | { kind: 'none' }
  | { kind: 'created'; name: string; url: string }
  | { kind: 'duplicate'; id: number; name: string }
  | { kind: 'error'; message: string }

const EMPTY: Extraction = {
  name: '', website: '', logo: '', categoryHint: '', plans: [], selected: -1, confidence: 'none', trial: null, trialMentioned: false,
}

function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="muted small">{hint}</span>}
      {error && <span className="error" role="alert">{error}</span>}
    </label>
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

  function onSuggestion(suggestion: Suggestion) {
    setValues((v) => applySuggestion(v, suggestion, ctx, edited.current, today))
    setSelectedPlan(-1)
    setAiApplied(true)
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
        setOutcome({ kind: 'created', name: values.name.trim(), url: result.url })
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === 'unauthorized') return onSignedOut()
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
    return (
      <section className="done" aria-live="polite">
        <h1 ref={resultRef} tabIndex={-1}>Added to Subly</h1>
        <p><strong>{outcome.name}</strong> is now in {ctx.workspace.name}.</p>
        <div className="actions">
          {outcome.url && (
            <a className="button primary" href={outcome.url} target="_blank" rel="noreferrer">
              Open in Subly
            </a>
          )}
          <button type="button" className="secondary" onClick={addAnother}>
            Add another
          </button>
        </div>
      </section>
    )
  }

  const currencies = currencyOptions([values.currency, ctx.workspace.baseCurrency])
  const weak = !plan || plan.confidence === 'low'
  const oneTime = values.range === 'once'

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void save(false)
      }}
    >
      {!ctx.canAdd && (
        <div className="notice warn" role="alert">
          <strong>You can’t add more right now.</strong> {ctx.limitReason ?? 'Your plan’s limit is reached.'}{' '}
          <a href={deps.baseUrl} target="_blank" rel="noreferrer">Open Subly</a>
        </div>
      )}

      <Notes
        extraction={extraction}
        plan={plan}
        workspaceCurrency={ctx.workspace.baseCurrency}
        unreadable={page.status === 'unreadable'}
        aiApplied={aiApplied}
      />

      {extraction.plans.length > 1 && (
        <PlanPicker plans={extraction.plans} selected={selectedPlan} fallbackCurrency={ctx.workspace.baseCurrency} onSelect={choosePlan} />
      )}

      <Field label="Name" error={errors.name}>
        <input
          name="name"
          value={values.name}
          onChange={(e) => update('name', e.target.value)}
          aria-invalid={Boolean(errors.name)}
          autoComplete="off"
        />
      </Field>

      <div className="row">
        <Field label="Amount" error={errors.amount}>
          <input
            name="amount"
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
        {!oneTime && (
          <Field label="Renews every" error={errors.freq}>
            <input
              name="freq"
              type="number"
              min={1}
              max={36}
              value={values.freq}
              onChange={(e) => update('freq', e.target.value)}
              aria-invalid={Boolean(errors.freq)}
            />
          </Field>
        )}
        <Field label={oneTime ? 'How it’s paid' : 'Period'}>
          <select name="range" value={values.range} onChange={(e) => changeRange(e.target.value as FormValues['range'])}>
            <option value="day">day(s)</option>
            <option value="week">week(s)</option>
            <option value="month">month(s)</option>
            <option value="year">year(s)</option>
            <option value="once">One-time (doesn’t renew)</option>
          </select>
        </Field>
      </div>

      <Field label={oneTime ? 'Charge date' : 'Next charge'} error={errors.date}>
        <input name="date" type="date" value={values.date} onChange={(e) => update('date', e.target.value)} aria-invalid={Boolean(errors.date)} />
      </Field>

      <div className="row">
        <Field label="Category">
          <select name="category" value={values.category} onChange={(e) => update('category', e.target.value)}>
            <option value="">Choose a category</option>
            {ctx.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Project">
          <select name="projectId" value={values.projectId} onChange={(e) => update('projectId', e.target.value)}>
            <option value="">No project</option>
            {ctx.projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
      </div>

      <details className="more">
        <summary>More details</summary>
        {ctx.paymentMethods.length > 0 && (
          <Field label="Payment method">
            <select name="paymentMethodId" value={values.paymentMethodId} onChange={(e) => update('paymentMethodId', e.target.value)}>
              <option value="">None</option>
              {ctx.paymentMethods.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
        )}
        {ctx.tags.length > 0 && (
          <fieldset className="tags">
            <legend className="label">Tags</legend>
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
          </fieldset>
        )}
        <Field label="Website" error={errors.website}>
          <input name="website" type="url" value={values.website} onChange={(e) => update('website', e.target.value)} placeholder="https://" />
        </Field>
        <Field label="Notes">
          <textarea name="notes" rows={2} value={values.notes} onChange={(e) => update('notes', e.target.value)} />
        </Field>
      </details>

      {snapshot && (
        <AiAssist
          api={deps.api}
          snapshot={snapshot}
          workspaceId={ctx.workspace.id}
          weak={weak}
          onSuggestion={onSuggestion}
          onSignedOut={onSignedOut}
        />
      )}

      {outcome.kind === 'duplicate' && (
        <div className="notice warn" role="alert" ref={messageRef}>
          <strong>Already in Subly:</strong> {outcome.name}{' '}
          <a href={`${deps.baseUrl}/recurring/${outcome.id}`} target="_blank" rel="noreferrer">View it</a>
          <div className="actions">
            <button type="button" className="primary" disabled={saving} onClick={() => void save(true)}>
              Add anyway
            </button>
          </div>
        </div>
      )}
      {outcome.kind === 'error' && (
        <div className="notice warn" role="alert" ref={messageRef}>{outcome.message}</div>
      )}

      <div className="sticky">
        <button type="submit" className="primary wide" disabled={saving || !ctx.canAdd}>
          {saving ? 'Adding…' : 'Add to Subly'}
        </button>
      </div>
    </form>
  )
}
