import { ScanText, Sparkles } from 'lucide-react'
import type { Extraction, PlanCandidate } from '../extract/types'
import { formatMoney } from './format'
import { Callout } from './kit'

const SOURCE: Record<PlanCandidate['source'], string> = {
  jsonld: 'the page’s structured data',
  microdata: 'the page’s markup',
  meta: 'the page’s meta tags',
  text: 'the text of the page',
}

const LEVEL = { high: 3, medium: 2, low: 1 } as const

interface Props {
  extraction: Extraction
  plan: PlanCandidate | null
  workspaceCurrency: string
  unreadable: boolean
  /** The AI filled the form in; the on-device confidence no longer describes it */
  aiApplied: boolean
}

/** Says what was found and how sure we are, in words, with every guess named */
export function Notes({ extraction, plan, workspaceCurrency, unreadable, aiApplied }: Props) {
  if (aiApplied) {
    return (
      <Callout tone="brand" icon={<Sparkles size={15} />}>
        <span>
          <strong>Filled in by AI.</strong> <span className="muted">Give the details a quick check before you add it.</span>
        </span>
      </Callout>
    )
  }
  if (unreadable) {
    return (
      <Callout>
        <span>
          <strong>Subly can’t read this page.</strong>{' '}
          <span className="muted">Chrome’s own pages and some stores are off limits. Fill in the details below.</span>
        </span>
      </Callout>
    )
  }
  if (!plan) {
    return (
      <Callout>
        <span>
          <strong>We couldn’t find a price here.</strong>{' '}
          <span className="muted">
            Add it below, or let AI take a closer look.
            {extraction.trialMentioned && <> The page mentions a free trial.</>}
          </span>
        </span>
      </Callout>
    )
  }

  const details: string[] = [`Price from ${SOURCE[plan.source]}.`]
  if (plan.billedAnnually) {
    details.push(`Shown as ${formatMoney(plan.amount / 12, plan.currency)} a month billed annually, so we entered the yearly amount.`)
  }
  if (plan.from) details.push('The page says “from”, so this is its lowest price.')
  if (!plan.billingRange && !plan.oneTime) details.push('The page doesn’t say how often it renews. We started with monthly.')
  if (plan.oneTime) details.push('This looks like a one-time payment.')
  if (!plan.currency) details.push(`No currency on the page. We used your workspace’s ${workspaceCurrency}.`)
  else if (plan.currencyGuessed) details.push(`The currency symbol is ambiguous. We read it as ${plan.currency}.`)
  if (extraction.trial) {
    const { freq, range } = extraction.trial
    details.push(`Includes a ${freq}-${range} free trial, so the first charge is set for when it ends.`)
  } else if (extraction.trialMentioned) {
    details.push('The page mentions a free trial. Set the first charge for when it ends.')
  }

  const title =
    plan.confidence === 'high' ? 'Read from this page' : plan.confidence === 'medium' ? 'Check these details' : 'We’re not sure about this price'
  const level = LEVEL[plan.confidence]
  return (
    <Callout tone={plan.confidence === 'low' ? 'attention' : 'neutral'} icon={plan.confidence === 'low' ? undefined : <ScanText size={15} />}>
      <div className="reading-head">
        <strong>{title}</strong>
        <span className="meter" data-level={level}>
          <span className="bars" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          {plan.confidence[0].toUpperCase() + plan.confidence.slice(1)} confidence
        </span>
      </div>
      <ul>
        {details.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
    </Callout>
  )
}
