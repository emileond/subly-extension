import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './ui/App'
import { createDeps } from './deps'
import './ui/styles.css'

async function boot() {
  // VITE_SUBLY_MOCK is replaced at build time, so the mock server and fixtures never reach a normal build
  const deps =
    import.meta.env.VITE_SUBLY_MOCK === '1'
      ? await (await import('./dev/deps')).createDevDeps()
      : createDeps()

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App deps={deps} />
    </React.StrictMode>
  )
}

void boot()
