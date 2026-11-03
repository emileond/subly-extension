import { useCallback, useEffect, useMemo, useState } from 'react'
import { LoaderCircle, RotateCw } from 'lucide-react'
import { ApiError, type ExtensionContext } from '../api/types'
import type { Deps } from '../deps'
import { extract } from '../extract/extract'
import type { PageRead } from '../page/readPage'
import { AddItem } from './AddItem'
import { Header } from './Header'
import { Callout } from './kit'

type Loaded<T> = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ok'; data: T }

interface Props {
  deps: Deps
  email: string
  /** The token ends within 7 days */
  endsSoon: boolean
  onSignOut: (notice?: string) => void
}

/** The shape of the form while the page and the account load */
function Skeleton() {
  return (
    <div className="body skeleton" aria-hidden="true">
      <span className="bone label" />
      <span className="bone tall" />
      <div className="row">
        <span className="bone" />
        <span className="bone" />
      </div>
      <div className="row">
        <span className="bone" />
        <span className="bone" />
      </div>
      <span className="bone" />
    </div>
  )
}

export function SignedIn({ deps, email, endsSoon, onSignOut }: Props) {
  const [ctx, setCtx] = useState<Loaded<ExtensionContext>>({ state: 'loading' })
  const [page, setPage] = useState<PageRead | null>(null)
  const [switching, setSwitching] = useState(false)

  const loadContext = useCallback(
    async (workspaceId?: number) => {
      try {
        setCtx((previous) => (previous.state === 'ok' ? previous : { state: 'loading' }))
        const data = await deps.api.getContext(workspaceId)
        setCtx({ state: 'ok', data })
      } catch (error) {
        if (error instanceof ApiError && error.code === 'unauthorized') {
          onSignOut(error.message)
          return
        }
        setCtx((previous) =>
          previous.state === 'ok' ? previous : { state: 'error', message: error instanceof Error ? error.message : 'Something went wrong.' }
        )
      } finally {
        setSwitching(false)
      }
    },
    [deps, onSignOut]
  )

  useEffect(() => {
    void loadContext()
    void deps.readPage().then(setPage)
  }, [deps, loadContext])

  const extraction = useMemo(() => (page?.status === 'ok' ? extract(page.snapshot) : null), [page])
  const data = ctx.state === 'ok' ? ctx.data : null
  const loading = (ctx.state === 'loading' || page === null) && ctx.state !== 'error'

  return (
    <main className="popup">
      <Header
        email={data?.user.email || email}
        workspaces={data?.workspaces ?? []}
        workspaceId={data?.workspace.id ?? null}
        switching={switching}
        baseUrl={deps.baseUrl}
        onWorkspace={(id) => {
          setSwitching(true)
          void loadContext(id)
        }}
        onSignOut={() => onSignOut()}
      />
      {(endsSoon || ctx.state === 'error' || loading) && (
        <div className="body" style={{ paddingBottom: 0 }}>
          {endsSoon && (
            <Callout>
              <span>
                Your extension sign-in ends soon.{' '}
                <button type="button" className="link" onClick={() => void deps.openLogin()}>
                  Sign in again
                </button>{' '}
                to keep adding without interruptions.
              </span>
            </Callout>
          )}
          {ctx.state === 'error' && (
            <Callout tone="attention" role="alert">
              <span>{ctx.message}</span>
              <div className="actions">
                <button type="button" className="button outline sm" onClick={() => void loadContext()}>
                  <RotateCw size={13} aria-hidden="true" />
                  Try again
                </button>
              </div>
            </Callout>
          )}
          {loading && (
            <p className="status-line" role="status">
              <LoaderCircle size={14} className="spin" aria-hidden="true" />
              Reading this page…
            </p>
          )}
        </div>
      )}
      {loading && <Skeleton />}
      {data && page && (
        <AddItem key="form" deps={deps} ctx={data} page={page} extraction={extraction} onSignedOut={onSignOut} />
      )}
    </main>
  )
}
