import { readMasterSession } from './masterAuth.js'

/** Logged-in Master shell — no userId in URL (session = localStorage). */
export const MASTER_ROUTE_PREFIX = '/master'

/** Master home (tiles + summary). */
export function getMasterPanelHome() {
  return `${MASTER_ROUTE_PREFIX}/dashboard`
}

/** Base for composing routes like `/master/live-bets`, `/master/master/super-admins`. */
export function getMasterPanelPrefix() {
  return MASTER_ROUTE_PREFIX
}

/**
 * Path under the logged-in master session (same browser tab).
 * @param {string} [suffix] e.g. `live-bets`, `master/super-admins`, `dashboard`
 */
export function masterSessionPath(suffix = '') {
  const s = readMasterSession()
  if (!s?.userId) return '/login'
  if (!suffix || suffix === 'dashboard') return getMasterPanelHome()
  const clean = suffix.startsWith('/') ? suffix.slice(1) : suffix
  return `${MASTER_ROUTE_PREFIX}/${clean}`
}

/** `/masters/:wrongId/...` → `/master/...` (session se verify; URL me ID nahi). */
export function remapMastersPathname(pathname, _sessionUserId) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] !== 'masters') return getMasterPanelHome()
  const rest = parts.slice(2).join('/')
  return rest ? `${MASTER_ROUTE_PREFIX}/${rest}` : getMasterPanelHome()
}

/** `/master-dashboard/...` → `/master/...` */
export function masterLegacyRedirectPath(pathname, _sessionUserId) {
  if (!pathname.startsWith('/master-dashboard')) return getMasterPanelHome()
  const rest = pathname.slice('/master-dashboard'.length).replace(/^\//, '')
  if (!rest) return getMasterPanelHome()
  return `${MASTER_ROUTE_PREFIX}/${rest}`
}
