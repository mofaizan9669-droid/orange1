import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import RoleLoginShell from '../components/RoleLoginShell.jsx'
import {
  isMasterLoggedIn,
  readMasterSession,
  setMasterSession,
  tryHierarchyRoleLogin,
  tryMasterLogin,
} from '../lib/masterAuth.js'
import { getMasterPanelHome, masterLegacyRedirectPath, remapMastersPathname } from '../lib/masterPaths.js'

export default function MasterLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from

  const defaultUser = String(import.meta.env.VITE_MASTER_USER ?? 'MSTR001')
  const [userId, setUserId] = useState(defaultUser)
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  if (isMasterLoggedIn()) {
    const s = readMasterSession()
    return <Navigate to={getMasterPanelHome()} replace />
  }

  const submit = (e) => {
    e.preventDefault()
    setErr('')
    let resolvedId = ''
    const result = tryMasterLogin(userId, password)
    if (result) {
      setMasterSession(result.userId, true)
      resolvedId = result.userId
    } else {
      const role = tryHierarchyRoleLogin(userId, password)
      if (!role) {
        setErr('Invalid username or password.')
        return
      }
      setMasterSession(role.userId, false)
      resolvedId = role.userId
    }
    let dest = getMasterPanelHome()
    if (typeof from === 'string') {
      if (from.startsWith('/master-dashboard')) {
        dest = masterLegacyRedirectPath(from, resolvedId)
      } else if (from.startsWith('/masters')) {
        dest = remapMastersPathname(from, resolvedId)
      }
    }
    navigate(dest, { replace: true })
  }

  return (
    <RoleLoginShell
      showPanelStrip={false}
      username={userId}
      password={password}
      onUsernameChange={setUserId}
      onPasswordChange={setPassword}
      error={err}
      onSubmit={submit}
    />
  )
}
