import { DEMO_ROLE_IDS } from '../lib/masterIdGen.js'
import SuperAdminDashboard from './SuperAdminDashboard.jsx'
import RoleLoginShell from '../components/RoleLoginShell.jsx'
import { useRolePortalEntry } from '../lib/rolePortalEntry.jsx'
import { clearSaSession, readSaSession, setSaSession, validateSaLogin } from '../lib/roleSessions.js'

export default function SuperAdminEntry() {
  const entry = useRolePortalEntry({
    portalKey: 'superadmin',
    defaultUserId: String(import.meta.env.VITE_SA_USER ?? DEMO_ROLE_IDS.sa[0]),
    readSession: readSaSession,
    setSession: setSaSession,
    clearSession: clearSaSession,
    validateLogin: validateSaLogin,
    renderDashboard: (sessionUserId, onLogout) => (
      <SuperAdminDashboard sessionUserId={sessionUserId} onLogout={onLogout} />
    ),
  })

  if (!entry.login) return entry

  return (
    <RoleLoginShell
      panelStrip="Super Admin panel"
      username={entry.user}
      password={entry.pw}
      onUsernameChange={entry.setUser}
      onPasswordChange={entry.setPw}
      error={entry.err}
      onSubmit={entry.onSubmit}
    />
  )
}
