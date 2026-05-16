import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  Archive,
  BarChart3,
  ChevronDown,
  ClipboardList,
  FileText,
  Layers,
  LayoutDashboard,
  Menu,
  Network,
  PlayCircle,
  Shield,
  Trophy,
  UserCog,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { resolveMasterSessionAccountKind } from '../lib/changePassword.js'
import { clearMasterSession, readMasterSession } from '../lib/masterAuth.js'
import { getMasterPanelHome, getMasterPanelPrefix } from '../lib/masterPaths.js'
import UserAccountMenu from '../components/UserAccountMenu.jsx'

const navClass = ({ isActive }) =>
  `crown-mx-nav-link${isActive ? ' crown-mx-nav-link--active' : ''}`

const nestLinkClass = ({ isActive }) =>
  `crown-mx-nest-link${isActive ? ' crown-mx-nest-link--active' : ''}`

const masterSubClass = ({ isActive }) =>
  `crown-mx-master-sub${isActive ? ' crown-mx-master-sub--active' : ''}`

export default function MasterShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const session = readMasterSession()
  const displayId = session?.userId ?? '—'
  const accountKind = resolveMasterSessionAccountKind(session)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [masterNestOpen, setMasterNestOpen] = useState(true)
  const [ledgerNestOpen, setLedgerNestOpen] = useState(false)
  const [reportsNestOpen, setReportsNestOpen] = useState(false)
  const [oldNestOpen, setOldNestOpen] = useState(false)

  const prefix = getMasterPanelPrefix()
  const home = getMasterPanelHome()

  useEffect(() => {
    const p = location.pathname
    const onLine =
      p.includes('/master/master/super-admins') ||
      p.includes('/master/master/admins') ||
      p.includes('/master/master/clients')
    const onMasterDash = /^\/master\/dashboard\/?$/.test(p) || /^\/master\/?$/.test(p)
    const id = window.requestAnimationFrame(() => {
      if (onLine || onMasterDash) setMasterNestOpen(true)
    })
    return () => window.cancelAnimationFrame(id)
  }, [location.pathname])

  if (!session?.userId) {
    return <Navigate to="/login" replace />
  }

  const closeSidebarOnNav = () => {
    setSidebarOpen(false)
  }

  return (
    <div className="crown-app crown-app--mx crown-app--orange">
      <div
        className={`crown-sidebar-overlay${sidebarOpen ? ' is-visible' : ''}`}
        role="presentation"
        aria-hidden={!sidebarOpen}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`crown-mx-sidebar${sidebarOpen ? ' is-open' : ''}`} aria-label="Main navigation">
        <div className="crown-mx-sidebar-head">
          <NavLink to={home} end className="crown-mx-sidebar-brand crown-mx-sidebar-brand--home">
            <span className="crown-mx-sidebar-logo">CROWN EX</span>
          </NavLink>
          <button
            type="button"
            className="crown-sidebar-close"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav
          className="crown-mx-side-nav"
          onClick={(e) => {
            if (e.target.closest('a[href^="/"]')) closeSidebarOnNav()
          }}
        >
          <NavLink to={home} end className={navClass} title="Live Bets, matches, quick tiles">
            <LayoutDashboard size={18} strokeWidth={2} />
            <span>Dashboard</span>
          </NavLink>

          <div className="crown-mx-nav-group">
            <button
              type="button"
              className={`crown-mx-nav-toggle crown-mx-nav-toggle--master${masterNestOpen ? ' is-open' : ''}`}
              onClick={() => setMasterNestOpen((v) => !v)}
              aria-expanded={masterNestOpen}
            >
              <span className="crown-mx-nav-toggle-label">
                <Users size={18} strokeWidth={2} />
                Master
              </span>
              <ChevronDown size={16} className="crown-mx-chev" aria-hidden />
            </button>
            {masterNestOpen ? (
              <div className="crown-mx-master-nest crown-mx-master-nest--ge">
                <NavLink
                  to={`${prefix}/master/super-admins`}
                  className={masterSubClass}
                  title="Super Admin list — ID, password, balance"
                >
                  <Shield size={16} strokeWidth={2} aria-hidden className="crown-mx-master-sub-ico" />
                  <span>Super Admin</span>
                </NavLink>
                <NavLink
                  to={`${prefix}/master/admins`}
                  className={masterSubClass}
                  title="Admin list — ID, password, line"
                >
                  <UserCog size={16} strokeWidth={2} aria-hidden className="crown-mx-master-sub-ico" />
                  <span>Admin</span>
                </NavLink>
                <NavLink
                  to={`${prefix}/master/clients`}
                  className={masterSubClass}
                  title="Client list — ID, password, map"
                >
                  <Users size={16} strokeWidth={2} aria-hidden className="crown-mx-master-sub-ico" />
                  <span>Client</span>
                </NavLink>
              </div>
            ) : null}
          </div>

          <NavLink to={`${prefix}/sports`} className={navClass}>
            <Layers size={18} strokeWidth={2} />
            <span>Sports betting</span>
          </NavLink>

          <div className="crown-mx-nav-group">
            <button
              type="button"
              className={`crown-mx-nav-toggle${ledgerNestOpen ? ' is-open' : ''}`}
              onClick={() => setLedgerNestOpen((v) => !v)}
              aria-expanded={ledgerNestOpen}
            >
              <span className="crown-mx-nav-toggle-label">
                <ClipboardList size={18} strokeWidth={2} />
                Ledger
              </span>
              <ChevronDown size={16} className="crown-mx-chev" aria-hidden />
            </button>
            {ledgerNestOpen ? (
              <div className="crown-mx-sub-nest">
                <NavLink to={`${prefix}/ledger`} className={nestLinkClass}>
                  Ledger overview
                </NavLink>
              </div>
            ) : null}
          </div>

          <NavLink to={`${prefix}/settlement`} className={navClass}>
            <Wallet size={18} strokeWidth={2} />
            <span>My Settlement</span>
          </NavLink>

          <NavLink to={`${prefix}/reports`} className={navClass}>
            <FileText size={18} strokeWidth={2} />
            <span>All Client Report</span>
          </NavLink>

          <NavLink to={`${prefix}/live-bets`} className={navClass}>
            <Activity size={18} strokeWidth={2} />
            <span>Current Bets</span>
          </NavLink>

          <NavLink to={`${prefix}/live-matches`} className={navClass}>
            <PlayCircle size={18} strokeWidth={2} />
            <span>Live Matches</span>
          </NavLink>

          <div className="crown-mx-nav-group">
            <button
              type="button"
              className={`crown-mx-nav-toggle${reportsNestOpen ? ' is-open' : ''}`}
              onClick={() => setReportsNestOpen((v) => !v)}
              aria-expanded={reportsNestOpen}
            >
              <span className="crown-mx-nav-toggle-label">
                <BarChart3 size={18} strokeWidth={2} />
                Reports
              </span>
              <ChevronDown size={16} className="crown-mx-chev" aria-hidden />
            </button>
            {reportsNestOpen ? (
              <div className="crown-mx-sub-nest">
                <NavLink to={`${prefix}/reports`} className={nestLinkClass}>
                  All reports
                </NavLink>
              </div>
            ) : null}
          </div>

          <NavLink to={`${prefix}/hierarchy`} className={navClass}>
            <Network size={18} strokeWidth={2} />
            <span>Client Tree</span>
          </NavLink>

          <div className="crown-mx-nav-group">
            <button
              type="button"
              className={`crown-mx-nav-toggle${oldNestOpen ? ' is-open' : ''}`}
              onClick={() => setOldNestOpen((v) => !v)}
              aria-expanded={oldNestOpen}
            >
              <span className="crown-mx-nav-toggle-label">
                <Archive size={18} strokeWidth={2} />
                OLD DATA
              </span>
              <ChevronDown size={16} className="crown-mx-chev" aria-hidden />
            </button>
            {oldNestOpen ? (
              <div className="crown-mx-sub-nest">
                <NavLink to={`${prefix}/old-data`} className={nestLinkClass}>
                  Archive
                </NavLink>
              </div>
            ) : null}
          </div>

          <NavLink to={`${prefix}/leaderboard`} className={navClass}>
            <Trophy size={18} strokeWidth={2} />
            <span>Leaderboard</span>
          </NavLink>
        </nav>
      </aside>

      <div className="crown-mx-main-wrap">
        <header className="crown-mx-topbar">
          <button
            type="button"
            className="crown-mx-hamburger"
            aria-label="Toggle sidebar"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <Menu size={22} strokeWidth={2} />
          </button>
          <NavLink
            to={home}
            end
            className="crown-mx-topbar-brand crown-mx-topbar-brand--home"
            title="Dashboard"
          >
            <span className="crown-mx-topbar-brand-mark" aria-hidden>
              👑
            </span>
            <span>CROWN EX</span>
          </NavLink>
          <UserAccountMenu
            variant="mx"
            userId={displayId}
            accountKind={accountKind}
            onLogout={() => {
              clearMasterSession()
              navigate('/login', { replace: true })
            }}
          />
        </header>

        <main className="crown-mx-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
