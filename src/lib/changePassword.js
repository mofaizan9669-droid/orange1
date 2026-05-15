import {
  ensureHierarchySeeded,
  patchAgentFields,
  patchSuperAdminFields,
  readAgentsSnapshot,
  readSuperAdminsSnapshot,
} from './hierarchySnapshot.js'

export const MIN_PASSWORD_LEN = 5

const LS_MASTER_PW_OVERRIDE = 'crown-master-password-overrides'

function normPw(p) {
  return String(p ?? '').trim()
}

function readMasterPwOverrides() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(LS_MASTER_PW_OVERRIDE)
    if (!raw) return {}
    const o = JSON.parse(raw)
    return o && typeof o === 'object' ? o : {}
  } catch {
    return {}
  }
}

function writeMasterPwOverrides(map) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LS_MASTER_PW_OVERRIDE, JSON.stringify(map))
}

export function getMasterPasswordOverride(userId) {
  const id = String(userId ?? '').trim()
  if (!id) return null
  const v = readMasterPwOverrides()[id]
  return v != null && String(v).trim() ? String(v).trim() : null
}

export function setMasterPasswordOverride(userId, password) {
  const id = String(userId ?? '').trim()
  if (!id) return
  const map = readMasterPwOverrides()
  map[id] = normPw(password)
  writeMasterPwOverrides(map)
}

function envMasterPasswordForUserId(userId) {
  const uid = String(userId ?? '').trim()
  const ownerId = String(import.meta.env.VITE_MASTER_OWNER_ID ?? '').trim()
  const ownerPw = String(import.meta.env.VITE_MASTER_OWNER_PASSWORD ?? '').trim()
  if (ownerId && ownerPw && uid === ownerId) return ownerPw

  const mainU = String(import.meta.env.VITE_MASTER_USER ?? 'MSTR001').trim()
  const mainP = String(import.meta.env.VITE_MASTER_PASSWORD ?? 'master123').trim()
  if (mainU && mainP && uid === mainU) return mainP
  return null
}

/** Master owner login password (override → .env). */
export function getEffectiveMasterPassword(userId) {
  const override = getMasterPasswordOverride(userId)
  if (override) return override
  return envMasterPasswordForUserId(userId)
}

function hierarchyRowPassword(rowPwd, fallback) {
  const b = normPw(rowPwd)
  return b || fallback
}

/**
 * @param {'master-owner' | 'super-admin' | 'admin'} accountKind
 */
export function verifyCurrentPassword(accountKind, userId, currentPassword) {
  const input = normPw(currentPassword)
  if (!input) return { ok: false, error: 'Enter current password.' }

  const uid = String(userId ?? '').trim()
  if (!uid) return { ok: false, error: 'Invalid account.' }

  if (accountKind === 'master-owner') {
    const expected = getEffectiveMasterPassword(uid)
    if (!expected) return { ok: false, error: 'Account not found.' }
    if (input !== expected) return { ok: false, error: 'Current password is incorrect.' }
    return { ok: true }
  }

  ensureHierarchySeeded()
  if (accountKind === 'super-admin') {
    const row = readSuperAdminsSnapshot().find((s) => s.userId === uid)
    if (!row || row.active === false) return { ok: false, error: 'Account not found.' }
    if (input !== hierarchyRowPassword(row.password, 'sa123')) {
      return { ok: false, error: 'Current password is incorrect.' }
    }
    return { ok: true }
  }

  if (accountKind === 'admin') {
    const row = readAgentsSnapshot().find((a) => a.userId === uid)
    if (!row || row.active === false) return { ok: false, error: 'Account not found.' }
    if (input !== hierarchyRowPassword(row.password, 'admin123')) {
      return { ok: false, error: 'Current password is incorrect.' }
    }
    return { ok: true }
  }

  return { ok: false, error: 'Password change not available for this account.' }
}

export function validateNewPasswordFields(newPassword, confirmPassword) {
  const next = normPw(newPassword)
  const again = normPw(confirmPassword)
  if (next.length < MIN_PASSWORD_LEN) {
    return { ok: false, error: `New password must be at least ${MIN_PASSWORD_LEN} characters.` }
  }
  if (next !== again) {
    return { ok: false, error: 'New password and re-enter password do not match.' }
  }
  return { ok: true, password: next }
}

/**
 * @param {'master-owner' | 'super-admin' | 'admin'} accountKind
 */
export function changeAccountPassword(accountKind, userId, currentPassword, newPassword, confirmPassword) {
  const cur = verifyCurrentPassword(accountKind, userId, currentPassword)
  if (!cur.ok) return cur

  const validated = validateNewPasswordFields(newPassword, confirmPassword)
  if (!validated.ok) return validated

  const next = validated.password
  if (normPw(currentPassword) === next) {
    return { ok: false, error: 'New password must be different from current password.' }
  }

  const uid = String(userId ?? '').trim()

  if (accountKind === 'master-owner') {
    setMasterPasswordOverride(uid, next)
    return { ok: true }
  }

  if (accountKind === 'super-admin') {
    if (!patchSuperAdminFields(uid, { password: next })) {
      return { ok: false, error: 'Could not update password.' }
    }
    return { ok: true }
  }

  if (accountKind === 'admin') {
    if (!patchAgentFields(uid, { password: next })) {
      return { ok: false, error: 'Could not update password.' }
    }
    return { ok: true }
  }

  return { ok: false, error: 'Password change not available.' }
}

/** Master shell: owner vs hierarchy SA / Admin row. */
export function resolveMasterSessionAccountKind(session) {
  if (!session?.userId) return null
  if (session.isOwner) return 'master-owner'
  ensureHierarchySeeded()
  const uid = session.userId
  if (readSuperAdminsSnapshot().some((s) => s.userId === uid)) return 'super-admin'
  if (readAgentsSnapshot().some((a) => a.userId === uid)) return 'admin'
  return null
}
