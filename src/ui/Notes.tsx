import type { Extraction, PlanCandidate } from '../extract/types'
import { formatMoney } from './format'

const SOURCE: Record<PlanCandidate['source'], string> = {
  jsonld: 'the page’s structured data',
  microdata: 'the page’s markup',
  meta: 'the page’s meta tags',
  text: 'the text of the page',
}

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
      <div className="notice info" role="status">
        <strong>Filled in by AI.</strong> Check the details before you save.
      </div>
    )
  }
  if (unreadable) {
    return (
      <div className="notice" role="status">
        <strong>Subly can’t read this page.</strong> Browser pages and some stores are off limits. Fill the form in below.
      </div>
    )
  }
  if (!plan) {
    return (
      <div className="notice" role="status">
        <strong>We couldn’t find a price here.</strong> Fill it in below.
        {extraction.trialMentioned && <> The page mentions a free trial.</>}
      </div>
    )
  }

  const details: string[] = [`Price read from ${SOURCE[plan.source]}.`]
  if (plan.billedAnnually) {
    details.push(
      `The page shows ${formatMoney(plan.amount / 12, plan.currency)} a month billed annually, so we entered the yearly amount.`
    )
  }
  if (plan.from) details.push('The page says “from”, so this is its lowest price.')
  if (!plan.billingRange && !plan.oneTime) details.push('The page doesn’t say how often it renews. We started with monthly.')
  if (plan.oneTime) details.push('This looks like a one-time payment.')
  if (!plan.currency) details.push(`No currency found. We used your workspace’s ${workspaceCurrency}.`)
  else if (plan.currencyGuessed) details.push(`The currency symbol is ambiguous. We read it as ${plan.currency}.`)
  if (extraction.trial) {
    const { freq, range } = extraction.trial
    details.push(`A free trial of ${freq} ${range}${freq > 1 ? 's' : ''} was found, so the first charge is set for when it ends.`)
  } else if (extraction.trialMentioned) {
    details.push('The page mentions a free trial. Set the first charge for when it ends.')
  }

  const title =
    plan.confidence === 'high' ? 'Read from this page.' : plan.confidence === 'medium' ? 'Check these details.' : 'We’re not sure about this price.'
  return (
    <div className={`notice ${plan.confidence === 'low' ? 'warn' : 'info'}`} role="status">
      <strong>{title}</strong> <span className="badge">{plan.confidence} confidence</span>
      <ul>
        {details.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
    </div>
  )
}
