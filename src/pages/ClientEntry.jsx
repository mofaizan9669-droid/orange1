import { DEMO_ROLE_IDS } from '../lib/masterIdGen.js'
import ClientDashboard from './ClientDashboard.jsx'
import RoleLoginShell from '../components/RoleLoginShell.jsx'
import { useRolePortalEntry } from '../lib/rolePortalEntry.jsx'
import { clearClientSession, readClientSession, setClientSession, validateClientLogin } from '../lib/roleSessions.js'

export default function ClientEntry() {
  const entry = useRolePortalEntry({
    portalKey: 'client',
    defaultUserId: String(import.meta.env.VITE_CLIENT_USER ?? DEMO_ROLE_IDS.cl[0]),
    readSession: readClientSession,
    setSession: setClientSession,
    clearSession: clearClientSession,
    validateLogin: validateClientLogin,
    renderDashboard: (clientUserId, onLogout) => (
      <ClientDashboard clientUserId={clientUserId} onLogout={onLogout} />
    ),
  })

  if (!entry.login) return entry

  return (
    <RoleLoginShell
      panelStrip="Client panel"
      username={entry.user}
      password={entry.pw}
      onUsernameChange={entry.setUser}
      onPasswordChange={entry.setPw}
      error={entry.err}
      onSubmit={entry.onSubmit}
    />
  )
}
