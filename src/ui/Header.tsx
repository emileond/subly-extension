interface HeaderProps {
  email: string | null
  workspaces: { id: number; name: string }[]
  workspaceId: number | null
  switching: boolean
  onWorkspace: (id: number) => void
  onSignOut: () => void
}

export function Header({ email, workspaces, workspaceId, switching, onWorkspace, onSignOut }: HeaderProps) {
  return (
    <header className="header">
      <div className="brand">
        <img src="/icon-512.png" alt="" width={22} height={22} />
        <span>Subly</span>
      </div>
      <div className="account">
        {email && <span className="muted email" title={email}>{email}</span>}
        <button type="button" className="link" onClick={onSignOut}>
          Sign out
        </button>
      </div>
      {workspaces.length > 1 && workspaceId !== null && (
        <select
          className="workspace"
          aria-label="Workspace"
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
    </header>
  )
}
