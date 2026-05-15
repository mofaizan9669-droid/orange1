/** Master login session (localStorage) — no hierarchy imports (avoids circular deps). */
export const LS_MASTER_SESSION = 'crown-master-session'

/**
 * @returns {{ userId: string, loggedAt: number, isOwner?: boolean } | null}
 */
export function readMasterSession() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LS_MASTER_SESSION)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (!p || typeof p.userId !== 'string' || !p.userId.trim()) return null
    return {
      userId: p.userId.trim(),
      loggedAt: Number(p.loggedAt) || 0,
      isOwner: p.isOwner === true,
    }
  } catch {
    return null
  }
}

/** @param {string} userId @param {boolean} [isOwner=false] */
export function setMasterSession(userId, isOwner = false) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    LS_MASTER_SESSION,
    JSON.stringify({
      userId: String(userId).trim(),
      loggedAt: Date.now(),
      isOwner: Boolean(isOwner),
    }),
  )
}

export function clearMasterSession() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(LS_MASTER_SESSION)
}

export function isMasterLoggedIn() {
  return readMasterSession() != null
}

export function isMasterOwner() {
  return readMasterSession()?.isOwner === true
}
