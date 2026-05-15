import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ClipboardList,
  Coins,
  FileText,
  LayoutDashboard,
  PlayCircle,
  Plus,
  ScrollText,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react'
import RolePanelLayout from '../components/RolePanelLayout.jsx'
import RoleOrbNav from '../components/RoleOrbNav.jsx'
import { ensureHierarchySeeded, readAgentsSnapshot, readSuperAdminsSnapshot } from '../lib/hierarchySnapshot.js'
import { getMasterPanelPrefix } from '../lib/masterPaths.js'
import { allocateNewIds, DEMO_ROLE_IDS } from '../lib/masterIdGen.js'
import { addClientForAgent, readClients } from '../lib/storage.js'
import { getAdminPath } from '../lib/rolePaths.js'
import { sanitizeDecimalInput, parseDecimalAmount } from '../lib/numericInput.js'

function fmtDash(n) {
  const x = Math.round(Number(n)) || 0
  return x.toLocaleString('en-IN')
}

function allTakenUserIds() {
  const ids = []
  readSuperAdminsSnapshot().forEach((s) => ids.push(s.userId))
  readAgentsSnapshot().forEach((a) => ids.push(a.userId))
  readClients().forEach((c) => ids.push(c.userId))
  return ids
}

export default function AgentDashboard({ agentUserId = DEMO_ROLE_IDS.ag[0], onLogout }) {
  const [tick, setTick] = useState(0)
  const [coinOpen, setCoinOpen] = useState(false)
  const [ledgerOpen, setLedgerOpen] = useState(false)
  const [reportsOpen, setReportsOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftLimit, setDraftLimit] = useState('')
  const [draftPassword, setDraftPassword] = useState('')

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    const fn = () => refresh()
    window.addEventListener('crown-hierarchy-demo-changed', fn)
    return () => window.removeEventListener('crown-hierarchy-demo-changed', fn)
  }, [refresh])

  const myClients = useMemo(() => {
    void tick
    return readClients().filter((c) => c.created_by_agent === agentUserId)
  }, [tick, agentUserId])

  const dash = useMemo(() => {
    void tick
    ensureHierarchySeeded()
    const ag = readAgentsSnapshot().find((a) => a.userId === agentUserId)
    if (!ag) return null
    const clients = readClients().filter((c) => c.created_by_agent === agentUserId)
    const clientBalSum = clients.reduce((sum, c) => sum + (Number(c.balanceCurrent ?? c.creditLimit) || 0), 0)
    return {
      balance: Number(ag.balanceCurrent) || 0,
      commissionSession: Number(ag.commissionSession) || 0,
      commissionMatch: Number(ag.commissionMatch) || 0,
      clientCount: clients.length,
      clientBalSum,
    }
  }, [tick, agentUserId])

  const { parentSaId, masterAdminProfile, panelBase } = useMemo(() => {
    void tick
    ensureHierarchySeeded()
    const base = getMasterPanelPrefix()
    const ag = readAgentsSnapshot().find((a) => a.userId === agentUserId)
    const saId = ag?.created_by_sa
    const profile =
      saId != null
        ? `${base}/master/super-admins/${encodeURIComponent(saId)}/admins/${encodeURIComponent(agentUserId)}`
        : `${base}/master/admins`
    return { parentSaId: saId, masterAdminProfile: profile, panelBase: base }
  }, [tick, agentUserId])

  const orbLinkItems = useMemo(
    () => [
      { to: getAdminPath(agentUserId), label: 'Dashboard', hint: 'Admin home', Icon: LayoutDashboard, tone: 'orange', end: true },
      { to: masterAdminProfile, label: 'Profile / Clients', hint: 'Master · admin line', Icon: UserCircle, tone: 'teal' },
      { to: `${panelBase}/master/clients`, label: 'All clients', hint: 'Master · full client list', Icon: Users, tone: 'amber' },
      { to: `${panelBase}/live-bets`, label: 'Live Bets', hint: 'Master · slips', Icon: Activity, tone: 'green' },
      { to: `${panelBase}/live-matches`, label: 'Live Matches', hint: 'Master · fixtures', Icon: PlayCircle, tone: 'cyan' },
      { to: `${panelBase}/settlement`, label: 'Settlement', hint: 'Master · P&L', Icon: Wallet, tone: 'blue' },
      { to: `${panelBase}/ledger`, label: 'Ledger', hint: 'Master · ledger page', Icon: ClipboardList, tone: 'indigo' },
      { to: `${panelBase}/reports`, label: 'Reports', hint: 'Master · reports', Icon: FileText, tone: 'red' },
    ],
    [masterAdminProfile, panelBase],
  )

  const submitClient = (e) => {
    e.preventDefault()
    const pw = draftPassword.trim()
    if (pw.length < 5) {
      window.alert('Password daalein (kam se kam 5 characters).')
      return
    }
    const name = draftName.trim() || 'Client'
    const creditLimit = parseDecimalAmount(draftLimit) || 0
    const agents = readAgentsSnapshot()
    const ag = agents.find((a) => a.userId === agentUserId)
    const mapLabel = ag ? `${agentUserId} → ${ag.created_by_sa}` : agentUserId
    const { nextClientId } = allocateNewIds(allTakenUserIds())
    addClientForAgent(agentUserId, {
      userId: nextClientId(),
      name,
      creditLimit,
      mapLabel,
      password: pw,
      mobile: '919800000000',
      active: true,
      betLocked: false,
      balanceCurrent: creditLimit,
      balanceEngaged: 0,
      commissionSession: 2,
      commissionMatch: 2,
    })
    setDraftName('')
    setDraftLimit('')
    setCreateOpen(false)
    refresh()
  }

  return (
    <RolePanelLayout portalKey="admin" userId={agentUserId} onLogout={onLogout}>
      <div className="crown-mx-welcome-bar crown-mx-welcome-bar--role">
        <span>Admin · quick actions (Master links need owner login)</span>
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
        <div className="crown-mx-client-strip" aria-label="Your clients">
          <span className="crown-mx-client-title">Client</span>
          <span className="crown-mx-client-pill crown-mx-client-pill--light">{dash.clientCount}</span>
          <span className="crown-mx-client-slash">/</span>
          <span className="crown-mx-client-balance">₹ {fmtDash(dash.clientBalSum)}</span>
        </div>
      ) : null}

      <RoleOrbNav
        items={orbLinkItems}
        ariaLabel="Admin quick actions"
        extras={
          <>
            <button
              type="button"
              className="crown-mx-tile crown-mx-tile--plain"
              title="Placeholder · Master coin flow"
              onClick={() => setCoinOpen(true)}
            >
              <span className="crown-mx-ico crown-mx-ico--orb crown-mx-ico--t-slate">
                <Coins size={28} strokeWidth={2} aria-hidden />
              </span>
              <span className="crown-mx-tile-label">Coin</span>
            </button>
            <button
              type="button"
              className="crown-mx-tile crown-mx-tile--plain"
              title="Placeholder · local ledger"
              onClick={() => setLedgerOpen(true)}
            >
              <span className="crown-mx-ico crown-mx-ico--orb crown-mx-ico--t-slate">
                <ScrollText size={28} strokeWidth={2} aria-hidden />
              </span>
              <span className="crown-mx-tile-label">Ledger note</span>
            </button>
            <button
              type="button"
              className="crown-mx-tile crown-mx-tile--plain"
              title="Placeholder · reports"
              onClick={() => setReportsOpen(true)}
            >
              <span className="crown-mx-ico crown-mx-ico--orb crown-mx-ico--t-slate">
                <FileText size={28} strokeWidth={2} aria-hidden />
              </span>
              <span className="crown-mx-tile-label">Reports note</span>
            </button>
            <button
              type="button"
              className="crown-mx-tile crown-mx-tile--plain"
              title="Create downline client"
              onClick={() => setCreateOpen(true)}
            >
              <span className="crown-mx-ico crown-mx-ico--orb crown-mx-ico--t-orange">
                <Plus size={28} strokeWidth={2} aria-hidden />
              </span>
              <span className="crown-mx-tile-label">New client</span>
            </button>
          </>
        }
      />

      <p className="crown-muted crown-role-hint">
        Client list aur coin Master me isi admin profile par:{' '}
        {parentSaId != null ? (
          <Link className="crown-link crown-link--inline" to={masterAdminProfile}>
            kholein
          </Link>
        ) : (
          <Link className="crown-link crown-link--inline" to={`${panelBase}/master/admins`}>
            Admin list
          </Link>
        )}
        . Naya client yahan se bhi create ho sakta hai.
      </p>

      <p className="crown-muted crown-role-hint">
        Naye client ka login: <strong>CL…</strong> ID + password <code>client123</code> (yahan se create par).
      </p>
      <div className="crown-sub-links">
        <Link className="crown-link" to={`${panelBase}/master/admins`}>
          Master · Admin list
        </Link>
      </div>

      {createOpen ? (
        <div className="crown-modal-bg" role="presentation" onClick={() => setCreateOpen(false)}>
          <div className="crown-modal" role="dialog" aria-labelledby="create-title" onClick={(ev) => ev.stopPropagation()}>
            <h2 id="create-title">Create new client</h2>
            <form onSubmit={submitClient} className="crown-form">
              <label>
                Name
                <input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Client name" />
              </label>
              <label>
                Password (min 5)
                <input
                  type="password"
                  autoComplete="new-password"
                  value={draftPassword}
                  onChange={(e) => setDraftPassword(e.target.value)}
                  placeholder="Client login password"
                />
              </label>
              <label>
                Credit limit (₹)
                <input
                  type="text"
                  inputMode="decimal"
                  value={draftLimit}
                  onChange={(e) => setDraftLimit(sanitizeDecimalInput(e.target.value))}
                  placeholder="0"
                />
              </label>
              <div className="crown-form-actions">
                <button type="button" className="crown-btn" onClick={() => setCreateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="crown-btn crown-btn--primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {coinOpen ? (
        <div className="crown-modal-bg" role="presentation" onClick={() => setCoinOpen(false)}>
          <div className="crown-modal" role="dialog" onClick={(ev) => ev.stopPropagation()}>
            <h2>Coin</h2>
            <p className="crown-muted">Yahan purana coin add/deduct UI restore hone ke baad lagega.</p>
            <button type="button" className="crown-btn crown-btn--primary" onClick={() => setCoinOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      {ledgerOpen ? (
        <div className="crown-modal-bg" role="presentation" onClick={() => setLedgerOpen(false)}>
          <div className="crown-modal" role="dialog" onClick={(ev) => ev.stopPropagation()}>
            <h2>Ledger</h2>
            <p className="crown-muted">Master jaisa coin ledger yahan backup se restore karein.</p>
            <button type="button" className="crown-btn crown-btn--primary" onClick={() => setLedgerOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      {reportsOpen ? (
        <div className="crown-modal-bg" role="presentation" onClick={() => setReportsOpen(false)}>
          <div className="crown-modal" role="dialog" onClick={(ev) => ev.stopPropagation()}>
            <h2>Reports</h2>
            <p className="crown-muted">Reports module backup se.</p>
            <button type="button" className="crown-btn crown-btn--primary" onClick={() => setReportsOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </RolePanelLayout>
  )
}
