import { Link } from 'react-router-dom'
import { Activity, LayoutDashboard, PlayCircle, Users, Wallet } from 'lucide-react'
import RolePanelLayout from '../components/RolePanelLayout.jsx'
import RoleOrbNav from '../components/RoleOrbNav.jsx'
import { getMasterPanelPrefix } from '../lib/masterPaths.js'
import { getClientPath } from '../lib/rolePaths.js'

export default function ClientDashboard({ clientUserId = 'CL', onLogout }) {
  const panelBase = getMasterPanelPrefix()
  const items = [
    { to: getClientPath(clientUserId), label: 'Dashboard', hint: 'Client home', Icon: LayoutDashboard, tone: 'orange', end: true },
    {
      to: `${panelBase}/master/clients`,
      label: 'Client line',
      hint: 'Master · saari IDs / map',
      Icon: Users,
      tone: 'amber',
    },
    { to: `${panelBase}/live-bets`, label: 'Live Bets', hint: 'Master · slips', Icon: Activity, tone: 'green' },
    { to: `${panelBase}/live-matches`, label: 'Live Matches', hint: 'Master · fixtures', Icon: PlayCircle, tone: 'cyan' },
    { to: `${panelBase}/settlement`, label: 'Settlement', hint: 'Master · P&L', Icon: Wallet, tone: 'blue' },
  ]

  return (
    <RolePanelLayout portalKey="client" userId={clientUserId} onLogout={onLogout}>
      <div className="crown-mx-welcome-bar crown-mx-welcome-bar--role">
        <span>Client · quick actions (Master links need owner login)</span>
      </div>

      <div className="crown-mx-summary-row crown-mx-summary-row--two crown-mx-summary-row--role">
        <div className="crown-mx-sum-card crown-mx-sum-card--orange crown-mx-sum-card--static">
          <span className="crown-mx-sum-label">Your ID</span>
          <span className="crown-mx-sum-mono">{clientUserId}</span>
        </div>
        <div className="crown-mx-sum-card crown-mx-sum-card--blue crown-mx-sum-card--static">
          <span className="crown-mx-sum-label">Map</span>
          <span className="crown-mx-sum-val">Master client list</span>
        </div>
      </div>

      <RoleOrbNav items={items} ariaLabel="Client quick actions" />

      <p className="crown-muted crown-role-hint">
        Login: apni <strong>CL…</strong> ID + password (default <code>client123</code> agar khali ho).
      </p>
      <div className="crown-sub-links">
        <Link className="crown-link" to={`${panelBase}/master/clients`}>
          Master · Client list
        </Link>
      </div>
    </RolePanelLayout>
  )
}
