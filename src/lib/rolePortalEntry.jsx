import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { clearMasterSession, readMasterSession, setMasterSession } from './masterAuth.js'
import { rolePortalPath } from './rolePaths.js'

/**
 * Shared login + URL sync for `/superadmin/:userId`, `/admin/:userId`, `/client/:userId`.
 */
export function useRolePortalEntry({
  portalKey,
  defaultUserId,
  readSession,
  setSession,
  clearSession,
  validateLogin,
  renderDashboard,
}) {
  const { userId: urlUserId } = useParams()
  const navigate = useNavigate()
  const [session, setLocalSession] = useState(() => readSession())
  const [user, setUser] = useState(() => urlUserId || defaultUserId)
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (urlUserId) setUser(urlUserId)
  }, [urlUserId])

  useEffect(() => {
    if (!session?.userId) return
    const dest = rolePortalPath(portalKey, session.userId)
    if (urlUserId !== session.userId) {
      navigate(dest, { replace: true })
    }
  }, [session, urlUserId, portalKey, navigate])

  const onSubmit = useCallback(
    (e) => {
      e.preventDefault()
      setErr('')
      const id = user.trim()
      if (!validateLogin(id, pw)) {
        setErr('Invalid username or password.')
        return
      }
      setSession(id)
      setMasterSession(id, false)
      setLocalSession(readSession())
      navigate(rolePortalPath(portalKey, id), { replace: true })
      setPw('')
    },
    [user, pw, portalKey, navigate, validateLogin, setSession, readSession],
  )

  const logout = useCallback(() => {
    const sid = readSession()?.userId
    clearSession()
    const master = readMasterSession()
    if (sid && master?.userId === sid && !master.isOwner) {
      clearMasterSession()
    }
    setLocalSession(null)
    setPw('')
    navigate(`/${portalKey}`, { replace: true })
  }, [clearSession, navigate, portalKey, readSession])

  if (session?.userId) {
    if (!urlUserId) {
      return <Navigate to={rolePortalPath(portalKey, session.userId)} replace />
    }
    if (urlUserId !== session.userId) {
      return <Navigate to={rolePortalPath(portalKey, session.userId)} replace />
    }
    return renderDashboard(session.userId, logout)
  }

  return {
    login: true,
    user,
    setUser,
    pw,
    setPw,
    err,
    onSubmit,
    urlUserId,
  }
}
