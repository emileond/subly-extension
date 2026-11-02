import { useState } from 'react'

export function SignedOut({ notice, baseUrl, onSignIn }: { notice?: string; baseUrl: string; onSignIn: () => Promise<void> }) {
  const [opening, setOpening] = useState(false)

  return (
    <section className="signed-out">
      <img src="/icon-512.png" alt="" width={56} height={56} />
      <h1>Add subscriptions to Subly</h1>
      {notice && <p className="notice warn" role="alert">{notice}</p>}
      <p className="muted">
        Sign in to Subly to add the subscription on the page you’re viewing. A new tab opens for signing in; when it
        says you’re connected, click the Subly icon again on the page you want to add.
      </p>
      <button
        type="button"
        className="primary"
        disabled={opening}
        onClick={() => {
          setOpening(true)
          onSignIn().finally(() => setOpening(false))
        }}
      >
        Sign in to Subly
      </button>
      <p className="muted small">
        New to Subly? <a href={`${baseUrl}/signup`} target="_blank" rel="noreferrer">Create an account</a>
      </p>
    </section>
  )
}
