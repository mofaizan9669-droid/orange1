import { useMemo } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { buildOwnerTree, ensureHierarchySeeded } from '../../lib/hierarchySnapshot.js'
import { getMasterPanelPrefix } from '../../lib/masterPaths.js'
import { buildMasterCricketTiles } from './masterCricketTiles.jsx'

const tileClass = ({ isActive }) =>
  `crown-mx-tile crown-mx-tile--plain${isActive ? ' crown-mx-tile--active' : ''}`

export default function MasterHome() {
  const panelBase = useMemo(() => getMasterPanelPrefix(), [])
  const cricketTiles = useMemo(() => buildMasterCricketTiles(panelBase), [panelBase])

  const { saCount, adminCount, clientCount } = useMemo(() => {
    ensureHierarchySeeded()
    const t = buildOwnerTree()
    let clients = 0
    let admins = 0
    for (const { agents } of t) {
      admins += agents.length
      for (const { clients: cl } of agents) {
        clients += cl.length
      }
    }
    return { saCount: t.length, adminCount: admins, clientCount: clients }
  }, [])

  return (
    <div className="crown-mx-dash">
      <div className="crown-mx-welcome-bar">
        <span>Cricket gaming · Master dashboard</span>
      </div>

      <div className="crown-mx-dash-announce" aria-label="Announcement">
        <span className="crown-mx-dash-announce-dot" aria-hidden />
        <span className="crown-mx-dash-announce-inner">
          Welcome to Crown Ex · Welcome to Crown Ex · Welcome to Crown Ex · Welcome to Crown Ex ·
        </span>
      </div>

      <div className="crown-mx-summary-row">
        <Link
          to={`${panelBase}/master/super-admins`}
          className="crown-mx-sum-card crown-mx-sum-card--orange crown-mx-sum-card--btn"
        >
          <span className="crown-mx-sum-label">Total Super Admin</span>
          <span className="crown-mx-sum-val">{saCount}</span>
        </Link>
        <Link
          to={`${panelBase}/master/admins`}
          className="crown-mx-sum-card crown-mx-sum-card--green crown-mx-sum-card--btn"
        >
          <span className="crown-mx-sum-label">Total Admin</span>
          <span className="crown-mx-sum-val">{adminCount}</span>
        </Link>
        <Link
          to={`${panelBase}/master/clients`}
          className="crown-mx-sum-card crown-mx-sum-card--orange-deep crown-mx-sum-card--btn"
        >
          <span className="crown-mx-sum-label">Total Client</span>
          <span className="crown-mx-sum-val">{clientCount}</span>
        </Link>
      </div>

      <nav className="crown-mx-tiles" aria-label="Cricket master quick actions">
        {cricketTiles.map(({ to, path, label, hint, Icon, tone }) => (
          <NavLink key={path} to={to} className={tileClass} title={hint}>
            <span className={`crown-mx-ico crown-mx-ico--orb crown-mx-ico--t-${tone}`}>
              <Icon size={28} strokeWidth={2} aria-hidden />
            </span>
            <span className="crown-mx-tile-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
