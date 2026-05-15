import { NavLink } from 'react-router-dom'

const tileClass = ({ isActive }) =>
  `crown-mx-tile crown-mx-tile--plain${isActive ? ' crown-mx-tile--active' : ''}`

/**
 * @param {{ to: string, label: string, hint?: string, end?: boolean, Icon: import('lucide-react').LucideIcon, tone: string }[]} items
 * @param {import('react').ReactNode} [extras] — extra tiles (e.g. modal buttons) inside the same grid
 */
export default function RoleOrbNav({ items, extras = null, ariaLabel = 'Quick links' }) {
  return (
    <nav className="crown-mx-tiles" aria-label={ariaLabel}>
      {items.map(({ to, label, hint, Icon, tone, end }) => (
        <NavLink key={`${to}${end ? '?end' : ''}`} to={to} end={Boolean(end)} className={tileClass} title={hint}>
          <span className={`crown-mx-ico crown-mx-ico--orb crown-mx-ico--t-${tone}`}>
            <Icon size={28} strokeWidth={2} aria-hidden />
          </span>
          <span className="crown-mx-tile-label">{label}</span>
        </NavLink>
      ))}
      {extras}
    </nav>
  )
}
