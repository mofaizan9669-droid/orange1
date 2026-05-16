/**
 * Demo hierarchy for Master owner view (localStorage).
 * IDs: SA + 4–6 digits, AG + 4–6 digits, CL + 5–6 digits (see masterIdGen.js).
 */
import { allocateNewIds, getLargeDemoIdBlock } from './masterIdGen.js'
import { ensurePanelDemoData, readLocalHierarchyPayload } from './hierarchyDemo.js'
import { getHierarchyCache, isCacheReady, setHierarchyCache } from './hierarchyCache.js'
import {
  isFirestoreEnabled,
  logBalanceDelta,
  logLimitUpdate,
  logTransfer,
  patchUserInFirestore,
  ensureFirestoreDemoSeed,
  startFirestoreSync,
  upsertUser,
} from './firestoreSync.js'
import { readClients, readClientsLocal, writeClients } from './storage.js'

let firestoreSeedStarted = false

function readSaStore() {
  if (isCacheReady()) {
    const c = getHierarchyCache().sas
    if (c.length > 0) return c
  }
  return readJson(LS_SA, [])
}

function readAgStore() {
  if (isCacheReady()) {
    const c = getHierarchyCache().agents
    if (c.length > 0) return c
  }
  return readJson(LS_AGENTS, [])
}

function writeSaStore(sas) {
  window.localStorage.setItem(LS_SA, JSON.stringify(sas))
  notifyHierarchyDemoChanged()
}

function writeAgStore(agents) {
  window.localStorage.setItem(LS_AGENTS, JSON.stringify(agents))
  notifyHierarchyDemoChanged()
}

function maybeSyncFirestoreFromLocal() {
  if (!isFirestoreEnabled() || firestoreSeedStarted) return
  firestoreSeedStarted = true
  const demo = ensurePanelDemoData()
  setHierarchyCache({ ...demo, source: 'local' })
  notifyHierarchyDemoChanged()
  startFirestoreSync()
  void (async () => {
    try {
      const seed = await ensureFirestoreDemoSeed()
      if (seed && !seed.ok) {
        window.alert(`Firestore seed failed: ${seed.error}\n\nFirebase Console → Firestore Rules me read/write allow karein.`)
      }
    } catch (e) {
      console.error('[Firestore] initial seed failed', e)
      window.alert(`Firestore connect error: ${e?.message || e}`)
    }
  })()
}

const LS_SA = 'crown-demo-superadmins'
const LS_AGENTS = 'crown-demo-agents'
const LS_HIER_VERSION = 'crown-hierarchy-demo-schema'
const HIER_CURRENT_VERSION = '8'

function maybeReseedHierarchyDemo() {
  if (typeof window === 'undefined') return
  try {
    if (window.localStorage.getItem(LS_HIER_VERSION) === HIER_CURRENT_VERSION) return
    window.localStorage.removeItem(LS_SA)
    window.localStorage.removeItem(LS_AGENTS)
    writeClients([])
    window.localStorage.setItem(LS_HIER_VERSION, HIER_CURRENT_VERSION)
    notifyHierarchyDemoChanged()
  } catch {
    /* ignore */
  }
}

function readJson(key, fallback = []) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const p = JSON.parse(raw)
    return Array.isArray(p) ? p : fallback
  } catch {
    return fallback
  }
}

function lineMapLabel(agentId, agents) {
  const ag = agents.find((a) => a.userId === agentId)
  if (!ag) return ''
  return `${agentId} → ${ag.created_by_sa}`
}

function notifyHierarchyDemoChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('crown-hierarchy-demo-changed'))
}

function seedDemoHierarchyIfEmpty() {
  if (typeof window === 'undefined') return
  const { sa: SA_IDS, ag: AG_IDS, cl: CL_IDS } = getLargeDemoIdBlock()

  if (!window.localStorage.getItem(LS_SA)) {
    const sas = SA_IDS.map((userId, idx) => ({
      userId,
      name: `SA Line ${String.fromCharCode(65 + idx)}`,
      mobile: `9190${String(1000000 + idx).slice(-7)}`,
      password: 'sa123',
      active: true,
      betLocked: false,
      balanceCurrent: 1800000 + idx * 240000,
      balanceEngaged: 0,
      commissionSession: 0,
      commissionMatch: 0,
    }))
    window.localStorage.setItem(LS_SA, JSON.stringify(sas))
  }

  if (!window.localStorage.getItem(LS_AGENTS)) {
    const sas = readJson(LS_SA, [])
    const saIds = sas.map((s) => s.userId)
    if (!saIds.length) return
    const agents = AG_IDS.map((userId, idx) => ({
      userId,
      name: `Admin ${idx + 1}`,
      created_by_sa: saIds[idx % saIds.length],
      mobile: `9198${String(1000000 + idx).slice(-7)}`,
      password: 'admin123',
      active: true,
      betLocked: false,
      balanceCurrent: 90000 + (idx % 10) * 28000,
      balanceEngaged: 0,
      commissionSession: 1,
      commissionMatch: 1,
    }))
    window.localStorage.setItem(LS_AGENTS, JSON.stringify(agents))
  }

  const list = readClients()
  if (list.length > 0) return

  const agents = readJson(LS_AGENTS, [])
  if (!agents.length) return
  const now = Date.now()

  const mk = (userId, name, creditLimit, agentId, mobile, betLocked, bal, tOff) => ({
    userId,
    name,
    creditLimit,
    created_by_agent: agentId,
    mapLabel: lineMapLabel(agentId, agents),
    mobile,
    password: 'client123',
    active: true,
    betLocked,
    balanceCurrent: bal,
    balanceEngaged: 0,
    commissionSession: 2,
    commissionMatch: 2,
    createdAt: now + tOff,
  })

  const clients = CL_IDS.map((userId, i) => {
    const agent = agents[i % agents.length]
    const lim = 7000 + (i % 19) * 1600
    return mk(
      userId,
      `Client ${i + 1}`,
      lim,
      agent.userId,
      `9197${String(1000000 + i).slice(-7)}`,
      i % 13 === 0,
      lim,
      -i * 35000,
    )
  })
  writeClients(clients)
}

function migrateClientsShape() {
  const list = readClients()
  if (!list.length) return
  let dirty = false
  const next = list.map((c, idx) => {
    const o = { ...c }
    if (o.active === undefined) {
      o.active = true
      dirty = true
    }
    if (o.betLocked === undefined) {
      o.betLocked = false
      dirty = true
    }
    if (o.mobile == null || o.mobile === '') {
      o.mobile = `9198${String(7000000 + idx).slice(-7)}`
      dirty = true
    }
    if (o.password == null || o.password === '') {
      o.password = `pass${String(idx + 1).padStart(2, '0')}`
      dirty = true
    }
    if (o.balanceCurrent === undefined) {
      o.balanceCurrent = Number.isFinite(o.creditLimit) ? o.creditLimit : 0
      dirty = true
    }
    if (o.balanceEngaged === undefined) {
      o.balanceEngaged = 0
      dirty = true
    }
    if (o.commissionSession === undefined) {
      o.commissionSession = 2
      dirty = true
    }
    if (o.commissionMatch === undefined) {
      o.commissionMatch = 2
      dirty = true
    }
    return o
  })
  if (dirty) writeClients(next)
}

function migrateAgentsShape() {
  const agents = readJson(LS_AGENTS, [])
  if (!agents.length) return
  let dirty = false
  const next = agents.map((a, idx) => {
    const o = { ...a }
    if (o.active === undefined) {
      o.active = true
      dirty = true
    }
    if (o.betLocked === undefined) {
      o.betLocked = false
      dirty = true
    }
    if (o.mobile == null || o.mobile === '') {
      o.mobile = `9197${String(6000000 + idx).slice(-7)}`
      dirty = true
    }
    if (o.password == null || o.password === '') {
      o.password = `adm${String(idx + 1).padStart(2, '0')}#x`
      dirty = true
    }
    if (o.balanceCurrent === undefined) {
      o.balanceCurrent = 50000 + idx * 10000
      dirty = true
    }
    if (o.balanceEngaged === undefined) {
      o.balanceEngaged = 0
      dirty = true
    }
    if (o.commissionSession === undefined) {
      o.commissionSession = 1
      dirty = true
    }
    if (o.commissionMatch === undefined) {
      o.commissionMatch = 1
      dirty = true
    }
    return o
  })
  if (dirty) window.localStorage.setItem(LS_AGENTS, JSON.stringify(next))
}

function migrateSaShape() {
  const sas = readJson(LS_SA, [])
  if (!sas.length) return
  let dirty = false
  const next = sas.map((s, idx) => {
    const o = { ...s }
    if (o.active === undefined) {
      o.active = true
      dirty = true
    }
    if (o.betLocked === undefined) {
      o.betLocked = false
      dirty = true
    }
    if (o.mobile == null || o.mobile === '') {
      o.mobile = `9190${String(1000000 + idx).slice(-7)}`
      dirty = true
    }
    if (o.password == null || o.password === '') {
      o.password = `sa${String(idx + 1).padStart(2, '0')}#x`
      dirty = true
    }
    if (o.balanceCurrent === undefined) {
      o.balanceCurrent = 400000 + idx * 50000
      dirty = true
    }
    if (o.balanceEngaged === undefined) {
      o.balanceEngaged = 0
      dirty = true
    }
    if (o.commissionSession === undefined) {
      o.commissionSession = 0
      dirty = true
    }
    if (o.commissionMatch === undefined) {
      o.commissionMatch = 0
      dirty = true
    }
    return o
  })
  if (dirty) window.localStorage.setItem(LS_SA, JSON.stringify(next))
}

export function ensureHierarchySeeded() {
  if (typeof window === 'undefined') return
  maybeReseedHierarchyDemo()
  ensurePanelDemoData()
  seedDemoHierarchyIfEmpty()
  migrateClientsShape()
  migrateAgentsShape()
  migrateSaShape()
  maybeSyncFirestoreFromLocal()
}

/** Toggle bet lock (persisted) — wrong bet hone par book lock. */
export function patchClientBetLock(userId, betLocked) {
  const list = readClients()
  const i = list.findIndex((c) => c.userId === userId)
  if (i === -1) return false
  list[i] = { ...list[i], betLocked }
  writeClients(list)
  return true
}

export function patchAgentBetLock(userId, betLocked) {
  const agents = readAgStore()
  const i = agents.findIndex((a) => a.userId === userId)
  if (i === -1) return false
  agents[i] = { ...agents[i], betLocked }
  writeAgStore(agents)
  void patchUserInFirestore(userId, { betLocked }).catch((e) => console.error(e))
  return true
}

export function patchSuperAdminBetLock(userId, betLocked) {
  const sas = readSaStore()
  const i = sas.findIndex((s) => s.userId === userId)
  if (i === -1) return false
  sas[i] = { ...sas[i], betLocked }
  writeSaStore(sas)
  void patchUserInFirestore(userId, { betLocked }).catch((e) => console.error(e))
  return true
}

export function patchClientFields(userId, partial) {
  const list = readClients()
  const i = list.findIndex((c) => c.userId === userId)
  if (i === -1) return false
  const before = { ...list[i] }
  const next = { ...list[i], ...partial }
  if (partial.creditLimit != null) next.updatedLimit = partial.creditLimit
  list[i] = next
  writeClients(list)
  const fsPatch = { ...partial }
  if (partial.creditLimit != null) fsPatch.updatedLimit = partial.creditLimit
  void patchUserInFirestore(userId, fsPatch, {
    type: 'limit_update',
    role: 'client',
    creditLimitBefore: before.creditLimit,
    creditLimitAfter: next.creditLimit,
    updatedLimit: next.updatedLimit ?? next.creditLimit,
    balanceBefore: before.balanceCurrent,
    balanceAfter: next.balanceCurrent,
  }).catch((e) => console.error(e))
  return true
}

export function patchAgentFields(userId, partial) {
  const agents = readAgStore()
  const i = agents.findIndex((a) => a.userId === userId)
  if (i === -1) return false
  const before = { ...agents[i] }
  const next = { ...agents[i], ...partial }
  if (partial.creditLimit != null || partial.balanceCurrent != null) {
    next.updatedLimit = partial.updatedLimit ?? partial.creditLimit ?? partial.balanceCurrent
  }
  agents[i] = next
  writeAgStore(agents)
  const fsPatch = { ...partial }
  if (fsPatch.creditLimit != null) fsPatch.updatedLimit = fsPatch.updatedLimit ?? fsPatch.creditLimit
  if (fsPatch.balanceCurrent != null && fsPatch.updatedLimit == null) {
    fsPatch.updatedLimit = fsPatch.balanceCurrent
  }
  void patchUserInFirestore(userId, fsPatch, {
    type: partial.creditLimit != null ? 'limit_update' : 'field_update',
    role: 'admin',
    balanceBefore: before.balanceCurrent,
    balanceAfter: next.balanceCurrent,
    updatedLimit: next.updatedLimit ?? null,
  }).catch((e) => console.error(e))
  return true
}

export function patchSuperAdminFields(userId, partial) {
  const sas = readSaStore()
  const i = sas.findIndex((s) => s.userId === userId)
  if (i === -1) return false
  const before = { ...sas[i] }
  const next = { ...sas[i], ...partial }
  if (partial.balanceCurrent != null) next.updatedLimit = partial.updatedLimit ?? partial.balanceCurrent
  sas[i] = next
  writeSaStore(sas)
  const fsPatch = { ...partial }
  if (partial.balanceCurrent != null) {
    fsPatch.updatedLimit = partial.updatedLimit ?? partial.balanceCurrent
  }
  void patchUserInFirestore(userId, fsPatch, {
    type: 'field_update',
    role: 'super-admin',
    balanceBefore: before.balanceCurrent,
    balanceAfter: next.balanceCurrent,
    updatedLimit: next.updatedLimit ?? null,
  }).catch((e) => console.error(e))
  return true
}

function clampPctStored(v, def = 0) {
  const x = Math.round(Number(v))
  if (!Number.isFinite(x)) return def
  return Math.min(100, Math.max(0, x))
}

function requirePassword(payload) {
  const pw = String(payload.password ?? '').trim()
  if (pw.length < 5) return { ok: false, error: 'bad-password' }
  return pw
}

function persistUserAsync(promise) {
  void promise.then((r) => {
    if (r && r.ok === false) {
      window.alert(
        `Firestore save failed: ${r.error || 'Unknown error'}\n\nFirebase Console → Firestore → Rules me read/write allow karein.`,
      )
    }
  })
}

/** All hierarchy userIds currently in localStorage (no seed side-effect). */
export function collectAllUserIds() {
  if (typeof window === 'undefined') return []
  const ids = []
  readSaStore().forEach((s) => ids.push(s.userId))
  readAgStore().forEach((a) => ids.push(a.userId))
  readClients().forEach((c) => ids.push(c.userId))
  return ids
}

export function appendSuperAdmin(payload) {
  ensureHierarchySeeded()
  const existing = new Set(collectAllUserIds())
  const alloc = allocateNewIds([...existing])
  const userId = String(payload.userId || '').trim() || alloc.nextSuperAdminId()
  if (existing.has(userId)) return { ok: false, error: 'duplicate-id' }
  const password = requirePassword(payload)
  if (typeof password !== 'string') return password
  const balanceCurrent = Number(payload.balanceCurrent)
  const sas = readSaStore()
  const row = {
    userId,
    name: String(payload.name || 'Super Admin').trim(),
    mobile: String(payload.mobile || '').replace(/\D/g, '') || '919000000000',
    password,
    active: true,
    betLocked: false,
    balanceCurrent: Number.isFinite(balanceCurrent) && balanceCurrent >= 0 ? balanceCurrent : 0,
    balanceEngaged: 0,
    commissionSession: clampPctStored(payload.commissionSession, 0),
    commissionMatch: clampPctStored(payload.commissionMatch, 0),
  }
  sas.push(row)
  writeSaStore(sas)
  void upsertUser(row, 'super-admin').catch((e) => console.error(e))
  return { ok: true, userId }
}

export function appendAgent(payload) {
  ensureHierarchySeeded()
  const existing = new Set(collectAllUserIds())
  const alloc = allocateNewIds([...existing])
  const userId = String(payload.userId || '').trim() || alloc.nextAgentId()
  if (existing.has(userId)) return { ok: false, error: 'duplicate-id' }
  const created_by_sa = String(payload.created_by_sa || '').trim()
  if (!created_by_sa) return { ok: false, error: 'missing-sa' }
  const sas = readSaStore()
  if (!sas.some((s) => s.userId === created_by_sa)) return { ok: false, error: 'invalid-sa' }
  const password = requirePassword(payload)
  if (typeof password !== 'string') return password
  const balanceCurrent = Number(payload.balanceCurrent)
  const agents = readAgStore()
  const row = {
    userId,
    name: String(payload.name || 'Admin').trim(),
    created_by_sa,
    mobile: String(payload.mobile || '').replace(/\D/g, '') || '919800000000',
    password,
    active: true,
    betLocked: false,
    balanceCurrent: Number.isFinite(balanceCurrent) && balanceCurrent >= 0 ? balanceCurrent : 0,
    balanceEngaged: 0,
    commissionSession: clampPctStored(payload.commissionSession, 1),
    commissionMatch: clampPctStored(payload.commissionMatch, 1),
  }
  agents.push(row)
  writeAgStore(agents)
  void upsertUser(row, 'admin').catch((e) => console.error(e))
  return { ok: true, userId }
}

export function appendClient(payload) {
  ensureHierarchySeeded()
  const existing = new Set(collectAllUserIds())
  const alloc = allocateNewIds([...existing])
  const userId = String(payload.userId || '').trim() || alloc.nextClientId()
  if (existing.has(userId)) return { ok: false, error: 'duplicate-id' }
  const created_by_agent = String(payload.created_by_agent || '').trim()
  if (!created_by_agent) return { ok: false, error: 'missing-agent' }
  const agents = readAgStore()
  if (!agents.some((a) => a.userId === created_by_agent)) return { ok: false, error: 'invalid-agent' }
  const password = requirePassword(payload)
  if (typeof password !== 'string') return password
  const creditLimit = Number(payload.creditLimit)
  const cL = Number.isFinite(creditLimit) && creditLimit >= 0 ? creditLimit : 0
  const list = readClients()
  const now = Date.now()
  const row = {
    userId,
    name: String(payload.name || 'Client').trim(),
    creditLimit: cL,
    updatedLimit: cL,
    created_by_agent,
    mapLabel: lineMapLabel(created_by_agent, agents),
    mobile: String(payload.mobile || '').replace(/\D/g, '') || '919876500000',
    password,
    active: true,
    betLocked: false,
    balanceCurrent: cL,
    balanceEngaged: 0,
    commissionSession: clampPctStored(payload.commissionSession, 2),
    commissionMatch: clampPctStored(payload.commissionMatch, 2),
    createdAt: now,
  }
  list.push(row)
  writeClients(list)
  persistUserAsync(upsertUser(row, 'client'))
  return { ok: true, userId }
}

function coinAmount(amount) {
  const n = Number(String(amount ?? '').replace(/,/g, ''))
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

/** User-facing alert when `result.ok === false` (optional `message` from transfers). */
export function formatHierarchyError(result) {
  if (!result || result.ok) return ''
  if (typeof result.message === 'string' && result.message.trim()) return result.message.trim()
  const e = result.error
  const m = {
    'bad-amount': 'Enter a valid amount.',
    'not-found': 'Record not found.',
    negative: 'Exceeds available balance.',
    'insufficient-sa': 'Insufficient balance in your wallet.',
    'insufficient-agent': 'Insufficient balance in that wallet.',
    'insufficient-client': 'Insufficient balance in that wallet.',
    duplicate: 'Duplicate ID.',
    'duplicate-id': 'Duplicate ID.',
    'missing-sa': 'Select a Super Admin line.',
    'invalid-sa': 'Invalid Super Admin line.',
    'missing-agent': 'Select an Admin.',
    'invalid-agent': 'Invalid Admin.',
    'bad-password': 'Password required (minimum 5 characters).',
    'firestore-failed': 'Firestore save failed. Check console and Firebase Rules.',
  }
  return m[e] || 'Could not complete this action.'
}

/** Mint (+) or burn (−) Super Admin balance (demo). */
export function adjustSuperAdminBalanceDelta(userId, delta) {
  ensureHierarchySeeded()
  const d = Number(delta)
  if (!Number.isFinite(d) || d === 0) return { ok: false, error: 'bad-amount' }
  const sas = readSaStore()
  const i = sas.findIndex((s) => s.userId === userId)
  if (i === -1) return { ok: false, error: 'not-found' }
  const cur = Number(sas[i].balanceCurrent) || 0
  const next = cur + d
  if (next < 0)
    return {
      ok: false,
      error: 'negative',
      message: `This amount is not available in ${userId}'s wallet.`,
    }
  sas[i] = { ...sas[i], balanceCurrent: next }
  writeSaStore(sas)
  void patchUserInFirestore(userId, { balanceCurrent: next }).catch((e) => console.error(e))
  void logBalanceDelta(userId, 'super-admin', d, cur, next).catch((e) => console.error(e))
  return { ok: true, balance: next }
}

export function setSuperAdminBalance(userId, absolute) {
  ensureHierarchySeeded()
  const n = Math.max(0, Number(String(absolute).replace(/,/g, '')))
  if (!Number.isFinite(n)) return { ok: false, error: 'bad-amount' }
  const sas = readSaStore()
  const i = sas.findIndex((s) => s.userId === userId)
  if (i === -1) return { ok: false, error: 'not-found' }
  const before = Number(sas[i].balanceCurrent) || 0
  sas[i] = { ...sas[i], balanceCurrent: n, updatedLimit: n }
  writeSaStore(sas)
  void patchUserInFirestore(userId, { balanceCurrent: n, updatedLimit: n }).catch((e) => console.error(e))
  void logLimitUpdate(userId, 'super-admin', { balance: before }, { balance: n, updatedLimit: n }).catch((e) =>
    console.error(e),
  )
  return { ok: true }
}

export function setAgentBalance(userId, absolute) {
  ensureHierarchySeeded()
  const n = Math.max(0, Math.round(Number(String(absolute).replace(/,/g, ''))))
  if (!Number.isFinite(n)) return { ok: false, error: 'bad-amount' }
  return patchAgentFields(userId, { balanceCurrent: n }) ? { ok: true } : { ok: false, error: 'not-found' }
}

/**
 * Set admin wallet to an absolute value while moving the difference via the parent SA pool
 * (increase admin ⇒ debit SA; decrease admin ⇒ credit SA).
 */
export function setAgentBalanceFromSa(saUserId, agentUserId, absolute) {
  ensureHierarchySeeded()
  const n = Math.max(0, Math.round(Number(String(absolute).replace(/,/g, ''))))
  if (!Number.isFinite(n)) return { ok: false, error: 'bad-amount' }
  const sas = readJson(LS_SA, [])
  const agents = readJson(LS_AGENTS, [])
  const si = sas.findIndex((s) => s.userId === saUserId)
  const ai = agents.findIndex((a) => a.userId === agentUserId && a.created_by_sa === saUserId)
  if (si === -1 || ai === -1) return { ok: false, error: 'not-found' }
  const oldAg = Number(agents[ai].balanceCurrent) || 0
  const delta = n - oldAg
  if (delta === 0) return { ok: true }
  const saBal = Number(sas[si].balanceCurrent) || 0
  if (delta > 0) {
    if (saBal < delta) return { ok: false, error: 'insufficient-sa', message: 'Insufficient balance in your wallet.' }
    sas[si] = { ...sas[si], balanceCurrent: saBal - delta }
    agents[ai] = { ...agents[ai], balanceCurrent: n }
  } else {
    const pull = -delta
    if (oldAg < pull)
      return {
        ok: false,
        error: 'insufficient-agent',
        message: `This amount is not available in ${agentUserId}'s wallet.`,
      }
    sas[si] = { ...sas[si], balanceCurrent: saBal + pull }
    agents[ai] = { ...agents[ai], balanceCurrent: n }
  }
  window.localStorage.setItem(LS_SA, JSON.stringify(sas))
  window.localStorage.setItem(LS_AGENTS, JSON.stringify(agents))
  notifyHierarchyDemoChanged()
  return { ok: true }
}

/** SA pool → Admin (debit SA, credit agent). */
export function transferCoinsSaToAgent(saUserId, agentUserId, amount) {
  ensureHierarchySeeded()
  const n = coinAmount(amount)
  if (n == null) return { ok: false, error: 'bad-amount' }
  const sas = readSaStore()
  const agents = readAgStore()
  const si = sas.findIndex((s) => s.userId === saUserId)
  const ai = agents.findIndex((a) => a.userId === agentUserId && a.created_by_sa === saUserId)
  if (si === -1 || ai === -1) return { ok: false, error: 'not-found' }
  const saBal = Number(sas[si].balanceCurrent) || 0
  if (saBal < n) return { ok: false, error: 'insufficient-sa', message: 'Insufficient balance in your wallet.' }
  const agBal = Number(agents[ai].balanceCurrent) || 0
  sas[si] = { ...sas[si], balanceCurrent: saBal - n }
  agents[ai] = { ...agents[ai], balanceCurrent: agBal + n }
  writeSaStore(sas)
  writeAgStore(agents)
  void patchUserInFirestore(saUserId, { balanceCurrent: sas[si].balanceCurrent }).catch((e) => console.error(e))
  void patchUserInFirestore(agentUserId, { balanceCurrent: agents[ai].balanceCurrent }).catch((e) => console.error(e))
  void logTransfer('transfer_sa_to_admin', saUserId, agentUserId, n).catch((e) => console.error(e))
  return { ok: true }
}

/** Admin → SA pool (credit SA, debit agent). */
export function transferCoinsAgentToSa(saUserId, agentUserId, amount) {
  ensureHierarchySeeded()
  const n = coinAmount(amount)
  if (n == null) return { ok: false, error: 'bad-amount' }
  const sas = readSaStore()
  const agents = readAgStore()
  const si = sas.findIndex((s) => s.userId === saUserId)
  const ai = agents.findIndex((a) => a.userId === agentUserId && a.created_by_sa === saUserId)
  if (si === -1 || ai === -1) return { ok: false, error: 'not-found' }
  const agBal = Number(agents[ai].balanceCurrent) || 0
  if (agBal < n)
    return {
      ok: false,
      error: 'insufficient-agent',
      message: `This amount is not available in ${agentUserId}'s wallet.`,
    }
  const saBal = Number(sas[si].balanceCurrent) || 0
  agents[ai] = { ...agents[ai], balanceCurrent: agBal - n }
  sas[si] = { ...sas[si], balanceCurrent: saBal + n }
  writeSaStore(sas)
  writeAgStore(agents)
  void patchUserInFirestore(saUserId, { balanceCurrent: sas[si].balanceCurrent }).catch((e) => console.error(e))
  void patchUserInFirestore(agentUserId, { balanceCurrent: agents[ai].balanceCurrent }).catch((e) => console.error(e))
  void logTransfer('transfer_admin_to_sa', agentUserId, saUserId, n).catch((e) => console.error(e))
  return { ok: true }
}

/** Admin pool → Client. */
export function transferCoinsAgentToClient(agentUserId, clientUserId, amount) {
  ensureHierarchySeeded()
  const n = coinAmount(amount)
  if (n == null) return { ok: false, error: 'bad-amount' }
  const agents = readAgStore()
  const list = readClients()
  const ai = agents.findIndex((a) => a.userId === agentUserId)
  const ci = list.findIndex((c) => c.userId === clientUserId && c.created_by_agent === agentUserId)
  if (ai === -1 || ci === -1) return { ok: false, error: 'not-found' }
  const agBal = Number(agents[ai].balanceCurrent) || 0
  if (agBal < n)
    return {
      ok: false,
      error: 'insufficient-agent',
      message: `Insufficient balance in ${agentUserId}'s wallet.`,
    }
  const c = list[ci]
  const cBal = Number(c.balanceCurrent ?? c.creditLimit) || 0
  const newBal = cBal + n
  const newLimit = Math.max(Number(c.creditLimit) || 0, newBal)
  agents[ai] = { ...agents[ai], balanceCurrent: agBal - n }
  list[ci] = { ...c, balanceCurrent: newBal, creditLimit: newLimit, updatedLimit: newLimit }
  writeAgStore(agents)
  writeClients(list)
  void patchUserInFirestore(agentUserId, { balanceCurrent: agents[ai].balanceCurrent }).catch((e) => console.error(e))
  void patchUserInFirestore(clientUserId, {
    balanceCurrent: newBal,
    creditLimit: newLimit,
    updatedLimit: newLimit,
  }).catch((e) => console.error(e))
  void logTransfer('transfer_admin_to_client', agentUserId, clientUserId, n).catch((e) => console.error(e))
  return { ok: true }
}

/** Client → Admin pool. */
export function transferCoinsClientToAgent(agentUserId, clientUserId, amount) {
  ensureHierarchySeeded()
  const n = coinAmount(amount)
  if (n == null) return { ok: false, error: 'bad-amount' }
  const agents = readAgStore()
  const list = readClients()
  const ai = agents.findIndex((a) => a.userId === agentUserId)
  const ci = list.findIndex((c) => c.userId === clientUserId && c.created_by_agent === agentUserId)
  if (ai === -1 || ci === -1) return { ok: false, error: 'not-found' }
  const c = list[ci]
  const cBal = Number(c.balanceCurrent ?? c.creditLimit) || 0
  if (cBal < n)
    return {
      ok: false,
      error: 'insufficient-client',
      message: `This amount is not available in ${clientUserId}'s wallet.`,
    }
  const agBal = Number(agents[ai].balanceCurrent) || 0
  const newCBal = cBal - n
  const newLimit = Math.max(newCBal, 0)
  agents[ai] = { ...agents[ai], balanceCurrent: agBal + n }
  list[ci] = {
    ...c,
    balanceCurrent: newCBal,
    creditLimit: newLimit,
    updatedLimit: newLimit,
  }
  writeAgStore(agents)
  writeClients(list)
  void patchUserInFirestore(agentUserId, { balanceCurrent: agents[ai].balanceCurrent }).catch((e) => console.error(e))
  void patchUserInFirestore(clientUserId, {
    balanceCurrent: newCBal,
    creditLimit: newLimit,
    updatedLimit: newLimit,
  }).catch((e) => console.error(e))
  void logTransfer('transfer_client_to_admin', clientUserId, agentUserId, n).catch((e) => console.error(e))
  return { ok: true }
}

export function readSuperAdminsSnapshot() {
  ensureHierarchySeeded()
  return readSaStore()
}

export function readAgentsSnapshot() {
  ensureHierarchySeeded()
  return readAgStore()
}

/** @returns {{ sa: object, agents: { agent: object, clients: object[] }[] }[]} */
export function buildOwnerTree() {
  const sas = readSuperAdminsSnapshot()
  const agents = readAgentsSnapshot()
  const clients = readClients()

  return sas.map((sa) => {
    const lineAgents = agents.filter((a) => a.created_by_sa === sa.userId)
    const agentsWithClients = lineAgents.map((agent) => ({
      agent,
      clients: clients.filter((c) => c.created_by_agent === agent.userId),
    }))
    return { sa, agents: agentsWithClients }
  })
}
