import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, type ExtensionContext } from '../api/types'
import type { Deps } from '../deps'
import { extract } from '../extract/extract'
import type { PageRead } from '../page/readPage'
import { AddItem } from './AddItem'
import { Header } from './Header'

type Loaded<T> = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ok'; data: T }

interface Props {
  deps: Deps
  email: string | null
  onSignOut: (notice?: string) => void
}

export function SignedIn({ deps, email, onSignOut }: Props) {
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
          onSignOut('Your Subly session ended. Sign in again to keep adding.')
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

  return (
    <main className="shell">
      <Header
        email={data?.user.email || email}
        workspaces={data?.workspaces ?? []}
        workspaceId={data?.workspace.id ?? null}
        switching={switching}
        onWorkspace={(id) => {
          setSwitching(true)
          void loadContext(id)
        }}
        onSignOut={() => onSignOut()}
      />
      {ctx.state === 'error' && (
        <div className="notice warn" role="alert">
          <p>{ctx.message}</p>
          <button type="button" onClick={() => void loadContext()}>
            Try again
          </button>
        </div>
      )}
      {(ctx.state === 'loading' || page === null) && ctx.state !== 'error' && (
        <p className="muted" role="status">Reading this page…</p>
      )}
      {data && page && (
        <AddItem
          key="form"
          deps={deps}
          ctx={data}
          page={page}
          extraction={extraction}
          onSignedOut={() => onSignOut('Your Subly session ended. Sign in again to keep adding.')}
        />
      )}
    </main>
  )
}
