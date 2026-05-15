/** Role portal URLs: `/superadmin/:userId`, `/admin/:userId`, `/client/:userId` */

export function rolePortalPath(portalKey, userId, suffix = '') {
  const id = String(userId ?? '').trim()
  const base = id ? `/${portalKey}/${encodeURIComponent(id)}` : `/${portalKey}`
  if (!suffix) return base
  const clean = suffix.startsWith('/') ? suffix.slice(1) : suffix
  return `${base}/${clean}`
}

export function getSuperAdminPath(userId, suffix = '') {
  return rolePortalPath('superadmin', userId, suffix)
}

export function getAdminPath(userId, suffix = '') {
  return rolePortalPath('admin', userId, suffix)
}

export function getClientPath(userId, suffix = '') {
  return rolePortalPath('client', userId, suffix)
}
