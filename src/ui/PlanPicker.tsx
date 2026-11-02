import type { PlanCandidate } from '../extract/types'
import { planPrice } from './format'

interface Props {
  plans: PlanCandidate[]
  selected: number
  fallbackCurrency: string
  onSelect: (index: number) => void
}

/** Several prices on one page: pick the one being bought */
export function PlanPicker({ plans, selected, fallbackCurrency, onSelect }: Props) {
  return (
    <fieldset className="plans">
      <legend className="label">Which plan is it?</legend>
      {plans.map((plan, index) => (
        <label key={index} className={`plan${selected === index ? ' on' : ''}`}>
          <input type="radio" name="plan" checked={selected === index} onChange={() => onSelect(index)} />
          <span className="plan-name">{plan.label || 'Plan'}</span>
          <span className="plan-price">{planPrice(plan, fallbackCurrency)}</span>
          {plan.highlighted && <span className="tag">Popular</span>}
        </label>
      ))}
    </fieldset>
  )
}
