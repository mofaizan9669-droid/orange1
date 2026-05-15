import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="crown-page crown-page--center">
      <h1 className="crown-title">CROWN EX</h1>
      <nav className="crown-nav-stack">
        <Link className="crown-btn crown-btn--primary" to="/login">
          Master login
        </Link>
        <Link className="crown-btn crown-btn--secondary" to="/superadmin">
          Super Admin panel
        </Link>
        <Link className="crown-btn crown-btn--secondary" to="/admin">
          Admin panel
        </Link>
        <Link className="crown-btn crown-btn--secondary" to="/client">
          Client panel
        </Link>
      </nav>
    </div>
  )
}
