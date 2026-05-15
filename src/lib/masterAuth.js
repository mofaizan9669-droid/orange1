import { getEffectiveMasterPassword } from './changePassword.js'
import { ensureHierarchySeeded, readAgentsSnapshot, readSuperAdminsSnapshot } from './hierarchySnapshot.js'
import {
  clearMasterSession,
  isMasterLoggedIn,
  isMasterOwner,
  LS_MASTER_SESSION,
  readMasterSession,
  setMasterSession,
} from './masterSession.js'
import { readClients } from './storage.js'

export {
  clearMasterSession,
  isMasterLoggedIn,
  isMasterOwner,
  LS_MASTER_SESSION,
  readMasterSession,
  setMasterSession,
} from './masterSession.js'

/**
 * Ek Master login ID (.env): VITE_MASTER_USER + VITE_MASTER_PASSWORD.
 * Optional alag owner line: VITE_MASTER_OWNER_ID + VITE_MASTER_OWNER_PASSWORD (bhi full access).
 * @returns {{ role: 'owner', userId: string } | null}
 */
export function tryMasterLogin(userId, password) {
  const uid = String(userId).trim()
  const pw = password

  const effective = getEffectiveMasterPassword(uid)
  if (effective && pw === effective) {
    return { role: 'owner', userId: uid }
  }

  return null
}

/**
 * Super Admin / Admin portal login (demo): same userId + password as hierarchy row.
 * Master owner session: sirf Super Admin create; SA neeche Admin+Client; Admin neeche Client.
 */
function hierarchyPwMatch(rowPwd, inputPwd, fallback) {
  const a = String(inputPwd ?? '').trim()
  if (!a) return false
  const b = String(rowPwd ?? '').trim() || fallback
  return a === b
}

/**
 * Master fallback login: any SA / AG / CL row in localStorage + uska password (trim).
 * Defaults: sa123 / admin123 / client123 agar row me password khali ho.
 */
export function tryHierarchyRoleLogin(userId, password) {
  const uid = String(userId ?? '').trim()
  if (!uid) return null
  ensureHierarchySeeded()
  const sa = readSuperAdminsSnapshot().find((s) => s.userId === uid)
  if (sa && sa.active !== false && hierarchyPwMatch(sa.password, password, 'sa123')) {
    return { role: 'super-admin', userId: uid }
  }
  const ag = readAgentsSnapshot().find((a) => a.userId === uid)
  if (ag && ag.active !== false && hierarchyPwMatch(ag.password, password, 'admin123')) {
    return { role: 'admin', userId: uid }
  }
  const cl = readClients().find((c) => c.userId === uid)
  if (cl && cl.active !== false && hierarchyPwMatch(cl.password, password, 'client123')) {
    return { role: 'client', userId: uid }
  }
  return null
}
