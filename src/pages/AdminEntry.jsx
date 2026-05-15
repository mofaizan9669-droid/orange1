import { DEMO_ROLE_IDS } from '../lib/masterIdGen.js'
import AgentDashboard from './AgentDashboard.jsx'
import RoleLoginShell from '../components/RoleLoginShell.jsx'
import { useRolePortalEntry } from '../lib/rolePortalEntry.jsx'
import { clearAdminSession, readAdminSession, setAdminSession, validateAdminLogin } from '../lib/roleSessions.js'

export default function AdminEntry() {
  const entry = useRolePortalEntry({
    portalKey: 'admin',
    defaultUserId: String(import.meta.env.VITE_ADMIN_USER ?? DEMO_ROLE_IDS.ag[0]),
    readSession: readAdminSession,
    setSession: setAdminSession,
    clearSession: clearAdminSession,
    validateLogin: validateAdminLogin,
    renderDashboard: (agentUserId, onLogout) => (
      <AgentDashboard agentUserId={agentUserId} onLogout={onLogout} />
    ),
  })

  if (!entry.login) return entry

  return (
    <RoleLoginShell
      panelStrip="Admin panel"
      username={entry.user}
      password={entry.pw}
      onUsernameChange={entry.setUser}
      onPasswordChange={entry.setPw}
      error={entry.err}
      onSubmit={entry.onSubmit}
    />
  )
}
