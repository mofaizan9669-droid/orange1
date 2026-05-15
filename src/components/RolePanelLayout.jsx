import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Home, LayoutDashboard, LogOut, Menu, Shield, UserCog, Users, X } from 'lucide-react'
import { masterSessionPath } from '../lib/masterPaths.js'
import { rolePortalPath } from '../lib/rolePaths.js'
import UserAccountMenu from './UserAccountMenu.jsx'

const PORTALS = [
  { key: 'superadmin', to: '/superadmin', label: 'Super Admin', Icon: Shield },
  { key: 'admin', to: '/admin', label: 'Admin', Icon: UserCog },
  { key: 'client', to: '/client', label: 'Client', Icon: Users },
]

const navLink = ({ isActive }) => `crown-role-nav-link${isActive ? ' is-active' : ''}`

const masterSubClass = ({ isActive }) =>
  `crown-mx-master-sub crown-mx-master-sub--role${isActive ? ' crown-mx-master-sub--active' : ''}`

export default function RolePanelLayout({ portalKey, userId, onLogout, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const headerAccountMenu = portalKey === 'superadmin' || portalKey === 'admin'
  const accountKind =
    portalKey === 'superadmin' ? 'super-admin' : portalKey === 'admin' ? 'admin' : null

  const current = PORTALS.find((p) => p.key === portalKey) ?? PORTALS[0]
  const PanelIcon = current.Icon
  const panelHome = rolePortalPath(portalKey, userId)

  return (
    <div className="crown-app crown-role-app">
      <div
        className={`crown-role-overlay${sidebarOpen ? ' is-on' : ''}`}
        role="presentation"
        aria-hidden={!sidebarOpen}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`crown-role-sidebar${sidebarOpen ? ' is-open' : ''}`} aria-label="Panel navigation">
        <div className="crown-role-side-head">
          <span className="crown-role-side-brand">CROWN EX</span>
          <button
            type="button"
            className="crown-role-side-close"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <nav
          className="crown-role-side-nav"
          onClick={(e) => {
            if (e.target.closest('a[href^="/"]')) setSidebarOpen(false)
          }}
        >
          <NavLink to={masterSessionPath('')} end className={navLink} title="Live Bets, tiles, summary">
            <LayoutDashboard size={18} strokeWidth={2} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to={panelHome} end className={navLink} title={`${current.label} panel home`}>
            <PanelIcon size={18} strokeWidth={2} />
            <span>{current.label}</span>
          </NavLink>

          {portalKey === 'superadmin' ? (
            <>
              <div className="crown-role-nav-divider" />
              <p className="crown-role-nav-group-label">Master</p>
              <div className="crown-mx-master-nest crown-mx-master-nest--ge crown-mx-master-nest--role">
                <NavLink
                  to={masterSessionPath('master/super-admins')}
                  className={masterSubClass}
                  title="Super Admin list"
                >
                  <Shield size={16} strokeWidth={2} aria-hidden className="crown-mx-master-sub-ico" />
                  <span>Super Admin</span>
                </NavLink>
                <NavLink to={masterSessionPath('master/admins')} className={masterSubClass} title="Admin list">
                  <UserCog size={16} strokeWidth={2} aria-hidden className="crown-mx-master-sub-ico" />
                  <span>Admin</span>
                </NavLink>
                <NavLink to={masterSessionPath('master/clients')} className={masterSubClass} title="Client list">
                  <Users size={16} strokeWidth={2} aria-hidden className="crown-mx-master-sub-ico" />
                  <span>Client</span>
                </NavLink>
              </div>
            </>
          ) : null}

          {portalKey === 'admin' ? (
            <>
              <div className="crown-role-nav-divider" />
              <p className="crown-role-nav-group-label">Admin</p>
              <div className="crown-mx-master-nest crown-mx-master-nest--ge crown-mx-master-nest--role">
                <NavLink to={masterSessionPath('master/clients')} className={masterSubClass} title="Client list">
                  <Users size={16} strokeWidth={2} aria-hidden className="crown-mx-master-sub-ico" />
                  <span>Client</span>
                </NavLink>
              </div>
            </>
          ) : null}

          <div className="crown-role-nav-divider" />
          <p className="crown-role-nav-group-label">Portals</p>
          {PORTALS.map(({ key, to, label, Icon }) => (
            <NavLink key={key} to={to} className={navLink}>
              <Icon size={18} strokeWidth={2} />
              <span>{label}</span>
            </NavLink>
          ))}
          <div className="crown-role-nav-divider" />
          <Link to="/" className="crown-role-nav-link crown-role-nav-link--ghost">
            <Home size={18} strokeWidth={2} />
            <span>Home</span>
          </Link>
        </nav>
        {portalKey === 'client' ? (
          <div className="crown-role-side-foot">
            <button type="button" className="crown-role-logout" onClick={onLogout}>
              <LogOut size={16} strokeWidth={2} />
              Logout
            </button>
          </div>
        ) : null}
      </aside>

      <div className="crown-role-maincol">
        <header className="crown-role-topbar">
          <button
            type="button"
            className="crown-role-burger"
            aria-label="Toggle menu"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <Menu size={22} strokeWidth={2} />
          </button>
          <span className="crown-role-topbar-title">{current.label}</span>
          {headerAccountMenu ? (
            <UserAccountMenu variant="role" userId={userId} accountKind={accountKind} onLogout={onLogout} />
          ) : (
            <span className="crown-role-topbar-user crown-mono">{userId}</span>
          )}
        </header>
        <main className="crown-role-main crown-main">{children}</main>
      </div>
    </div>
  )
}
