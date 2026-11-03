import { useMemo, useState } from 'react'
import { ChevronDown, LoaderCircle, Sparkles } from 'lucide-react'
import { ApiError, type Suggestion } from '../api/types'
import type { ApiClient } from '../api/client'
import { buildParseRequest } from '../extract/ai'
import type { PageSnapshot } from '../extract/types'
import { Callout } from './kit'

interface Props {
  api: ApiClient
  snapshot: PageSnapshot
  workspaceId: number
  /** The on-device result is weak: make the button the main way forward */
  weak: boolean
  onSuggestion: (suggestion: Suggestion) => void
  onSignedOut: (message: string) => void
  /** The allowance is spent; the server still sent what it could read without the model */
  onAllowanceSpent: (suggestion: Suggestion | null) => void
}

type State = { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string }

/** The only thing in the extension that sends page content anywhere before saving, and only when this button is pressed */
export function AiAssist({ api, snapshot, workspaceId, weak, onSuggestion, onSignedOut, onAllowanceSpent }: Props) {
  const [state, setState] = useState<State>({ status: 'idle' })
  const request = useMemo(() => buildParseRequest(snapshot, workspaceId), [snapshot, workspaceId])

  async function run() {
    setState({ status: 'loading' })
    try {
      const suggestion = await api.parse(request)
      setState({ status: 'idle' })
      onSuggestion(suggestion)
    } catch (error) {
      if (error instanceof ApiError && error.code === 'unauthorized') return onSignedOut(error.message)
      if (error instanceof ApiError && error.code === 'allowance') onAllowanceSpent(error.suggestion)
      const message =
        error instanceof ApiError && error.code === 'allowance'
          ? 'You’ve used your AI allowance for now. We filled in what we could read without it; add the rest yourself.'
          : error instanceof Error
            ? error.message
            : 'Something went wrong.'
      setState({ status: 'error', message })
    }
  }

  const loading = state.status === 'loading'
  return (
    <section className={`ai${weak ? ' weak' : ''}`} aria-label="Read with AI">
      <div className="ai-head">
        <span className="ai-icon" aria-hidden="true">
          <Sparkles size={15} />
        </span>
        <div>
          <p className="ai-title">{weak ? 'Let AI take a closer look' : 'Something look off?'}</p>
          <p className="small muted">AI reads the page again and fills in what it finds. Anything you typed stays.</p>
        </div>
      </div>
      <button type="button" className="button outline wide" disabled={loading} onClick={run}>
        {loading ? <LoaderCircle size={14} className="spin" aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}
        {loading ? 'Reading this page…' : 'Read this page with AI'}
      </button>
      <details className="disclosure">
        <summary>
          What gets sent
          <ChevronDown size={13} aria-hidden="true" />
        </summary>
        <p className="small muted" style={{ marginTop: 8 }}>
          Only when you press the button: this page’s address (without anything after “?”), title, meta tags, structured
          data and up to 6,000 characters of its text.
        </p>
        <pre tabIndex={0}>{JSON.stringify(request, null, 2)}</pre>
      </details>
      {state.status === 'error' && (
        <Callout tone="attention" role="alert">
          {state.message}
        </Callout>
      )}
    </section>
  )
}
