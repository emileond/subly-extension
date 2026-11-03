import { useState, type ReactNode, type Ref } from 'react'
import { CircleAlert, Info, TriangleAlert } from 'lucide-react'

/** The Subly mark as the app draws it (light and dark files, never tinted), with the name in the display face */
export function Logo({ wordmark = true, height = 22 }: { wordmark?: boolean; height?: number }) {
  return (
    <span className="logo">
      <picture>
        <source srcSet="/logo-dark.svg" media="(prefers-color-scheme: dark)" />
        <img src="/logo.svg" alt={wordmark ? '' : 'Subly'} style={{ height }} />
      </picture>
      {wordmark && <span className="display">Subly</span>}
    </span>
  )
}

/** The service's logo from the page, or its first letter when there is none or it does not load */
export function ServiceLogo({ src, name, large }: { src: string; name: string; large?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null)
  const letter = name.trim().charAt(0) || '·'
  const size = large ? ' large' : ''
  if (!src || failed === src) {
    return (
      <span className={`service-logo monogram${size}`} aria-hidden="true">
        {letter}
      </span>
    )
  }
  return (
    <span className={`service-logo${size}`} aria-hidden="true">
      <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailed(src)} />
    </span>
  )
}

type Tone = 'neutral' | 'brand' | 'attention' | 'problem'

const ICON: Record<Tone, ReactNode> = {
  neutral: <Info size={15} />,
  brand: <Info size={15} />,
  attention: <TriangleAlert size={15} />,
  problem: <CircleAlert size={15} />,
}

/** A short message in the flow of the popup: neutral by default, amber for attention, red for problems */
export function Callout({
  tone = 'neutral',
  icon,
  role = 'status',
  children,
  ref,
}: {
  tone?: Tone
  icon?: ReactNode
  role?: 'status' | 'alert'
  children: ReactNode
  ref?: Ref<HTMLDivElement>
}) {
  return (
    <div className={`callout ${tone}`} role={role} ref={ref}>
      {icon ?? ICON[tone]}
      <div className="content">{children}</div>
    </div>
  )
}
