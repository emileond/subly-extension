import { useCallback, useEffect, useState } from 'react'
import type { Deps } from '../deps'
import { SignedIn } from './SignedIn'
import { SignedOut } from './SignedOut'

type AuthState = { status: 'loading' } | { status: 'in'; email: string | null } | { status: 'out'; notice?: string }

export default function App({ deps }: { deps: Deps }) {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    deps.auth.getSession().then((session) => {
      if (!cancelled) setAuth(session ? { status: 'in', email: session.email } : { status: 'out' })
    })
    return () => {
      cancelled = true
    }
  }, [deps])

  const signOut = useCallback(
    async (notice?: string) => {
      await deps.auth.signOut()
      setAuth({ status: 'out', notice })
    },
    [deps]
  )

  if (auth.status === 'loading') {
    return (
      <main className="shell">
        <p className="muted" role="status">Loading…</p>
      </main>
    )
  }

  if (auth.status === 'out') {
    return (
      <main className="shell">
        <SignedOut notice={auth.notice} baseUrl={deps.baseUrl} onSignIn={() => deps.openLogin()} />
      </main>
    )
  }

  return <SignedIn deps={deps} email={auth.email} onSignOut={signOut} />
}
