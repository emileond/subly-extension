import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Callout, Logo } from './kit'

const STEPS = [
  'Sign in once, in the tab that opens',
  'Come back and click the Subly icon',
  'Check the details and add it',
]

export function SignedOut({ notice, baseUrl, onSignIn }: { notice?: string; baseUrl: string; onSignIn: () => Promise<void> }) {
  const [opened, setOpened] = useState(false)

  return (
    <section className="welcome">
      <div className="welcome-head">
        <Logo wordmark={false} height={30} />
        <h1 className="display">Catch every subscription the moment you find it</h1>
        <p className="muted">
          Open Subly on any pricing or checkout page. It reads the name, price and renewal for you, so nothing renews
          without you knowing.
        </p>
      </div>

      {notice && (
        <Callout tone="attention" role="alert">
          {notice}
        </Callout>
      )}

      {opened ? (
        <Callout>
          <strong>Waiting for you to sign in in the new tab.</strong>
          <span className="muted">When it says the extension is connected, click the Subly icon again on the page you want to add.</span>
        </Callout>
      ) : (
        <ol className="steps">
          {STEPS.map((step, index) => (
            <li key={step}>
              <span className="step-dot" aria-hidden="true">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      )}

      <button
        type="button"
        className="button primary lg wide"
        onClick={() => {
          setOpened(true)
          void onSignIn()
        }}
      >
        Sign in to Subly
        {opened && <ExternalLink size={14} aria-hidden="true" />}
      </button>

      <p className="welcome-foot small muted">
        New to Subly?{' '}
        <a href={`${baseUrl}/signup`} target="_blank" rel="noreferrer">
          Create a free account
        </a>
      </p>
    </section>
  )
}
