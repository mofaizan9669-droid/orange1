import { Link } from 'react-router-dom'
import { MASTER_ONLY_LABEL } from '../lib/productPhase.js'

export default function RolePanelsComingSoon() {
  return (
    <div className="crown-page crown-page--center">
      <h1 className="crown-title">CROWN EX</h1>
      <p className="crown-muted" style={{ maxWidth: '22rem', textAlign: 'center' }}>
        {MASTER_ONLY_LABEL}
      </p>
      <nav className="crown-nav-stack">
        <Link className="crown-btn crown-btn--primary" to="/login">
          Master login
        </Link>
        <Link className="crown-btn crown-btn--secondary" to="/master/dashboard">
          Master dashboard
        </Link>
      </nav>
    </div>
  )
}
