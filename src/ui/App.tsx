import { useCallback, useEffect, useState } from 'react'
import { signedOutMessage } from '../api/client'
import type { Deps } from '../deps'
import { expiresSoon, isExpired } from '../lib/credential'
import { SignedIn } from './SignedIn'
import { SignedOut } from './SignedOut'

type AuthState =
  | { status: 'loading' }
  | { status: 'in'; email: string; endsSoon: boolean }
  | { status: 'out'; notice?: string }

export default function App({ deps }: { deps: Deps }) {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    deps.auth.getCredential().then(async (credential) => {
      if (cancelled) return
      if (!credential) return setAuth({ status: 'out' })
      if (isExpired(credential)) {
        await deps.auth.signOut()
        return setAuth({ status: 'out', notice: signedOutMessage('token_expired') })
      }
      setAuth({ status: 'in', email: credential.user.email, endsSoon: expiresSoon(credential) })
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
      <main className="popup" aria-busy="true">
        <p className="sr-only" role="status">Loading…</p>
      </main>
    )
  }

  if (auth.status === 'out') {
    return (
      <main className="popup">
        <SignedOut notice={auth.notice} baseUrl={deps.baseUrl} onSignIn={() => deps.openLogin()} />
      </main>
    )
  }

  return <SignedIn deps={deps} email={auth.email} endsSoon={auth.endsSoon} onSignOut={signOut} />
}
