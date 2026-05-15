import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ClipboardList,
  FileText,
  LayoutDashboard,
  PlayCircle,
  Shield,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react'
import RolePanelLayout from '../components/RolePanelLayout.jsx'
import RoleOrbNav from '../components/RoleOrbNav.jsx'
import { ensureHierarchySeeded, readAgentsSnapshot, readSuperAdminsSnapshot } from '../lib/hierarchySnapshot.js'
import { getMasterPanelPrefix } from '../lib/masterPaths.js'
import { getSuperAdminPath } from '../lib/rolePaths.js'
import { readClients } from '../lib/storage.js'

function fmtDash(n) {
  const x = Math.round(Number(n)) || 0
  return x.toLocaleString('en-IN')
}

export default function SuperAdminDashboard({ sessionUserId = 'SA', onLogout }) {
  const [tick, setTick] = useState(0)
  const bump = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    const keys = ['crown-clients-v1', 'crown-demo-superadmins', 'crown-demo-agents']
    const onStorage = (e) => {
      if (e.key && keys.includes(e.key)) bump()
    }
    const onHierarchy = () => bump()
    const onVis = () => {
      if (document.visibilityState === 'visible') bump()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('crown-hierarchy-demo-changed', onHierarchy)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('crown-hierarchy-demo-changed', onHierarchy)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [bump])

  const dash = useMemo(() => {
    void tick
    ensureHierarchySeeded()
    const sas = readSuperAdminsSnapshot()
    const sa = sas.find((s) => s.userId === sessionUserId)
    if (!sa) return null
    const agents = readAgentsSnapshot().filter((a) => a.created_by_sa === sessionUserId)
    const agentIds = new Set(agents.map((a) => a.userId))
    const clients = readClients().filter((c) => agentIds.has(c.created_by_agent))
    const clientBalSum = clients.reduce((sum, c) => sum + (Number(c.balanceCurrent ?? c.creditLimit) || 0), 0)
    return {
      balance: Number(sa.balanceCurrent) || 0,
      commissionSession: Number(sa.commissionSession) || 0,
      commissionMatch: Number(sa.commissionMatch) || 0,
      clientCount: clients.length,
      clientBalSum,
      adminCount: agents.length,
    }
  }, [sessionUserId, tick])

  const panelBase = useMemo(() => {
    void tick
    return getMasterPanelPrefix()
  }, [tick])

  const masterSaProfile = useMemo(
    () => `${panelBase}/master/super-admins/${encodeURIComponent(sessionUserId)}`,
    [panelBase, sessionUserId],
  )

  const orbItems = useMemo(
    () => [
      {
        to: getSuperAdminPath(sessionUserId),
        label: 'Dashboard',
        hint: 'Super Admin home',
        Icon: LayoutDashboard,
        tone: 'orange',
        end: true,
      },
      { to: masterSaProfile, label: 'Line / Profile', hint: 'Master · is line ki profile', Icon: Shield, tone: 'violet' },
      { to: `${panelBase}/master/admins`, label: 'Admins', hint: 'Master · admin list', Icon: UserCog, tone: 'teal' },
      { to: `${panelBase}/master/clients`, label: 'Clients', hint: 'Master · client list', Icon: Users, tone: 'amber' },
      { to: `${panelBase}/live-bets`, label: 'Live Bets', hint: 'Master · slips', Icon: Activity, tone: 'green' },
      { to: `${panelBase}/live-matches`, label: 'Live Matches', hint: 'Master · fixtures', Icon: PlayCircle, tone: 'cyan' },
      { to: `${panelBase}/settlement`, label: 'Settlement', hint: 'Master · P&L', Icon: Wallet, tone: 'blue' },
      { to: `${panelBase}/ledger`, label: 'Ledger', hint: 'Master · coins', Icon: ClipboardList, tone: 'indigo' },
      { to: `${panelBase}/reports`, label: 'Reports', hint: 'Master · reports', Icon: FileText, tone: 'red' },
    ],
    [masterSaProfile, panelBase, sessionUserId],
  )

  return (
    <RolePanelLayout portalKey="superadmin" userId={sessionUserId} onLogout={onLogout}>
      <div className="crown-mx-welcome-bar crown-mx-welcome-bar--role">
        <span>Super Admin · quick actions</span>
      </div>

      <div className="crown-mx-summary-row crown-mx-summary-row--three crown-mx-summary-row--role">
        <div className="crown-mx-sum-card crown-mx-sum-card--green crown-mx-sum-card--static">
          <span className="crown-mx-sum-label">My account</span>
          <span className="crown-mx-sum-val">₹ {dash != null ? fmtDash(dash.balance) : '—'}</span>
        </div>
        <div className="crown-mx-sum-card crown-mx-sum-card--amber crown-mx-sum-card--static">
          <span className="crown-mx-sum-label">My share</span>
          <span className="crown-mx-sum-val">{dash != null ? `${dash.commissionSession}%` : '—'}</span>
          {dash != null ? (
            <span className="crown-mx-sum-sub">Match {dash.commissionMatch}%</span>
          ) : null}
        </div>
        <div className="crown-mx-sum-card crown-mx-sum-card--blue crown-mx-sum-card--static">
          <span className="crown-mx-sum-label">Commission</span>
          <span className="crown-mx-sum-val">
            {dash != null ? `M ${dash.commissionMatch} / S ${dash.commissionSession}` : '—'}
          </span>
        </div>
      </div>

      {dash != null ? (
        <div className="crown-mx-client-strip" aria-label="Clients under your line">
          <span className="crown-mx-client-title">Client</span>
          <span className="crown-mx-client-pill crown-mx-client-pill--light">{dash.clientCount}</span>
          <span className="crown-mx-client-slash">/</span>
          <span className="crown-mx-client-balance">₹ {fmtDash(dash.clientBalSum)}</span>
        </div>
      ) : null}

      <RoleOrbNav items={orbItems} ariaLabel="Super Admin quick actions" />

      <p className="crown-muted crown-role-hint">
        Nayi IDs se login: Master me banayi hui <strong>SA…</strong> ID + wahi password (default <code>sa123</code> jab set na ho).
      </p>
      <div className="crown-sub-links">
        <Link className="crown-link" to={`${panelBase}/master/super-admins`}>
          Master · Super Admin list
        </Link>
      </div>
    </RolePanelLayout>
  )
}
