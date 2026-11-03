import { useEffect, useRef, useState } from 'react'
import { ExternalLink, LogOut } from 'lucide-react'
import { Logo } from './kit'

interface HeaderProps {
  email: string | null
  workspaces: { id: number; name: string }[]
  workspaceId: number | null
  switching: boolean
  baseUrl: string
  onWorkspace: (id: number) => void
  onSignOut: () => void
}

export function Header({ email, workspaces, workspaceId, switching, baseUrl, onWorkspace, onSignOut }: HeaderProps) {
  return (
    <header className="header">
      <Logo />
      <span className="spacer" />
      {workspaces.length > 1 && workspaceId !== null && (
        <select
          className="workspace-select"
          aria-label="Workspace"
          title="The workspace this is added to"
          value={workspaceId}
          disabled={switching}
          onChange={(e) => onWorkspace(Number(e.target.value))}
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      )}
      <AccountMenu email={email} baseUrl={baseUrl} onSignOut={onSignOut} />
    </header>
  )
}

/** Who is signed in, a way back to the app, and signing out */
function AccountMenu({ email, baseUrl, onSignOut }: { email: string | null; baseUrl: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="account" ref={root}>
      <button
        type="button"
        className="avatar"
        aria-label="Account"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        {email?.charAt(0) || '?'}
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-head">
            <span className="small muted">Signed in as</span>
            {email && (
              <span className="email" title={email}>
                {email}
              </span>
            )}
          </div>
          <a className="menu-item" role="menuitem" href={baseUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={15} aria-hidden="true" />
            Open Subly
          </a>
          <button type="button" className="menu-item" role="menuitem" onClick={onSignOut}>
            <LogOut size={15} aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
