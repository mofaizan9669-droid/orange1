import { ensureHierarchySeeded, readAgentsSnapshot, readSuperAdminsSnapshot } from './hierarchySnapshot.js'
import { readClients } from './storage.js'

export const LS_SA_SESSION = 'crown-sa-session'
export const LS_ADMIN_SESSION = 'crown-admin-session'
export const LS_CLIENT_SESSION = 'crown-client-session'

function readJson(key) {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function readSaSession() {
  const p = readJson(LS_SA_SESSION)
  if (!p || typeof p.userId !== 'string' || !p.userId.trim()) return null
  return { userId: p.userId.trim() }
}

export function readAdminSession() {
  const p = readJson(LS_ADMIN_SESSION)
  if (!p || typeof p.userId !== 'string' || !p.userId.trim()) return null
  return { userId: p.userId.trim() }
}

export function readClientSession() {
  const p = readJson(LS_CLIENT_SESSION)
  if (!p || typeof p.userId !== 'string' || !p.userId.trim()) return null
  return { userId: p.userId.trim() }
}

export function setSaSession(userId) {
  window.localStorage.setItem(LS_SA_SESSION, JSON.stringify({ userId: String(userId).trim() }))
}

export function setAdminSession(userId) {
  window.localStorage.setItem(LS_ADMIN_SESSION, JSON.stringify({ userId: String(userId).trim() }))
}

export function setClientSession(userId) {
  window.localStorage.setItem(LS_CLIENT_SESSION, JSON.stringify({ userId: String(userId).trim() }))
}

export function clearSaSession() {
  window.localStorage.removeItem(LS_SA_SESSION)
}

export function clearAdminSession() {
  window.localStorage.removeItem(LS_ADMIN_SESSION)
}

export function clearClientSession() {
  window.localStorage.removeItem(LS_CLIENT_SESSION)
}

function normPw(p) {
  return String(p ?? '').trim()
}

export function validateSaLogin(username, password) {
  const id = String(username).trim()
  const envU = import.meta.env.VITE_SA_USER?.trim()
  const envP = import.meta.env.VITE_SA_PASSWORD
  ensureHierarchySeeded()
  const input = normPw(password)
  if (!input) return false
  if (envU && envP !== undefined && id === envU) {
    const row = readSuperAdminsSnapshot().find((s) => s.userId === id)
    if (row && row.active === false) return false
    return input === normPw(envP)
  }
  const row = readSuperAdminsSnapshot().find((s) => s.userId === id)
  if (!row || row.active === false) return false
  const expected = normPw(row.password) || 'sa123'
  return input === expected
}

export function validateAdminLogin(username, password) {
  const id = String(username).trim()
  const envU = import.meta.env.VITE_ADMIN_USER?.trim()
  const envP = import.meta.env.VITE_ADMIN_PASSWORD
  ensureHierarchySeeded()
  const input = normPw(password)
  if (!input) return false
  if (envU && envP !== undefined && id === envU) {
    const row = readAgentsSnapshot().find((a) => a.userId === id)
    if (row && row.active === false) return false
    return input === normPw(envP)
  }
  const row = readAgentsSnapshot().find((a) => a.userId === id)
  if (!row || row.active === false) return false
  const expected = normPw(row.password) || 'admin123'
  return input === expected
}

export function validateClientLogin(username, password) {
  const id = String(username).trim()
  const envU = import.meta.env.VITE_CLIENT_USER?.trim()
  const envP = import.meta.env.VITE_CLIENT_PASSWORD
  ensureHierarchySeeded()
  const input = normPw(password)
  if (!input) return false
  if (envU && envP !== undefined && id === envU) {
    const row = readClients().find((c) => c.userId === id)
    if (row && row.active === false) return false
    return input === normPw(envP)
  }
  const row = readClients().find((c) => c.userId === id)
  if (!row || row.active === false) return false
  const expected = normPw(row.password) || 'client123'
  return input === expected
}

/** Master deactivate: agar ye ID role portal me logged in ho to session clear. */
export function clearRoleSessionIfUserId(userId) {
  if (typeof window === 'undefined') return
  const id = String(userId).trim()
  const sa = readSaSession()
  if (sa?.userId === id) clearSaSession()
  const ad = readAdminSession()
  if (ad?.userId === id) clearAdminSession()
  const cl = readClientSession()
  if (cl?.userId === id) clearClientSession()
}
