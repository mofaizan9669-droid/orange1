import { Link } from 'react-router-dom'
import { MASTER_ONLY_LABEL, ROLE_PANELS_ENABLED } from '../lib/productPhase.js'

export default function Home() {
  return (
    <div className="crown-page crown-page--center">
      <h1 className="crown-title">CROWN EX</h1>
      {!ROLE_PANELS_ENABLED ? (
        <p className="crown-muted" style={{ maxWidth: '22rem', textAlign: 'center', marginBottom: '1rem' }}>
          {MASTER_ONLY_LABEL}
        </p>
      ) : null}
      <nav className="crown-nav-stack">
        <Link className="crown-btn crown-btn--primary" to="/login">
          Master login
        </Link>
        {ROLE_PANELS_ENABLED ? (
          <>
            <Link className="crown-btn crown-btn--secondary" to="/superadmin">
              Super Admin panel
            </Link>
            <Link className="crown-btn crown-btn--secondary" to="/admin">
              Admin panel
            </Link>
            <Link className="crown-btn crown-btn--secondary" to="/client">
              Client panel
            </Link>
          </>
        ) : null}
      </nav>
    </div>
  )
}
