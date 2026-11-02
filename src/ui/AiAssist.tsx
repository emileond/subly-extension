import { useMemo, useState } from 'react'
import { ApiError, type Suggestion } from '../api/types'
import type { ApiClient } from '../api/client'
import { buildParseRequest } from '../extract/ai'
import type { PageSnapshot } from '../extract/types'

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
          ? 'You’ve used your AI allowance for now. We filled in what we could read without it; the rest is yours to fill in.'
          : error instanceof Error
            ? error.message
            : 'Something went wrong.'
      setState({ status: 'error', message })
    }
  }

  return (
    <div className="ai">
      <button type="button" className={weak ? 'secondary strong' : 'secondary'} disabled={state.status === 'loading'} onClick={run}>
        {state.status === 'loading' ? 'Reading this page…' : 'Read this page with AI'}
      </button>
      <p className="muted small">
        Sends Subly this page’s address (without anything after “?”), title, meta tags, structured data and up to
        6,000 characters of its text. Only when you press the button.
      </p>
      <details>
        <summary>Show exactly what will be sent</summary>
        <pre tabIndex={0}>{JSON.stringify(request, null, 2)}</pre>
      </details>
      {state.status === 'error' && (
        <p className="notice warn" role="alert">
          {state.message}
        </p>
      )}
    </div>
  )
}
