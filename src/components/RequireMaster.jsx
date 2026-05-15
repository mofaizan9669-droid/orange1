import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isMasterLoggedIn } from '../lib/masterAuth.js'

export default function RequireMaster() {
  const location = useLocation()
  if (!isMasterLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
