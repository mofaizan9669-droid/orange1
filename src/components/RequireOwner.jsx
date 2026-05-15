import { Navigate } from 'react-router-dom'
import { isMasterOwner, readMasterSession } from '../lib/masterAuth.js'
import { getMasterPanelHome } from '../lib/masterPaths.js'

export default function RequireOwner({ children }) {
  const s = readMasterSession()
  if (!isMasterOwner()) {
    return <Navigate to={s?.userId ? getMasterPanelHome() : '/login'} replace />
  }
  return children
}
