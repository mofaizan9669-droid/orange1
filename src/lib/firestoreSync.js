import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  addDoc,
} from 'firebase/firestore'
import { db, hasFirebaseConfig } from './firebase.js'
import { setHierarchyCache } from './hierarchyCache.js'
import { ensurePanelDemoData, readLocalHierarchyPayload } from './hierarchyDemo.js'
import { mirrorHierarchyToLocal } from './hierarchyLocalMirror.js'
import { readMasterSession } from './masterSession.js'

const USERS = 'users'
const TRANSACTIONS = 'transactions'

let unsubscribeUsers = null
let started = false
let lastSyncError = null

function stripUndefined(obj) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out
}

export function getFirestoreSyncError() {
  return lastSyncError
}

function notify() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('crown-hierarchy-demo-changed'))
}

function roleFromPrefix(userId) {
  const id = String(userId || '').toUpperCase()
  if (id.startsWith('SA')) return 'super-admin'
  if (id.startsWith('AG') || id.startsWith('ADM')) return 'admin'
  if (id.startsWith('CL')) return 'client'
  return 'unknown'
}

function docToSa(data) {
  return {
    userId: data.userId,
    name: data.name ?? '',
    mobile: data.mobile ?? '',
    password: data.password ?? '',
    active: data.active !== false,
    betLocked: data.betLocked === true,
    balanceCurrent: Number(data.balanceCurrent) || 0,
    balanceEngaged: Number(data.balanceEngaged) || 0,
    commissionSession: Number(data.commissionSession) || 0,
    commissionMatch: Number(data.commissionMatch) || 0,
    updatedLimit: data.updatedLimit != null ? Number(data.updatedLimit) : undefined,
  }
}

function docToAgent(data) {
  return {
    userId: data.userId,
    name: data.name ?? '',
    created_by_sa: data.created_by_sa ?? '',
    mobile: data.mobile ?? '',
    password: data.password ?? '',
    active: data.active !== false,
    betLocked: data.betLocked === true,
    balanceCurrent: Number(data.balanceCurrent) || 0,
    balanceEngaged: Number(data.balanceEngaged) || 0,
    commissionSession: Number(data.commissionSession) || 0,
    commissionMatch: Number(data.commissionMatch) || 0,
    updatedLimit: data.updatedLimit != null ? Number(data.updatedLimit) : undefined,
  }
}

function docToClient(data) {
  return {
    userId: data.userId,
    name: data.name ?? '',
    creditLimit: Number(data.creditLimit) || 0,
    created_by_agent: data.created_by_agent ?? '',
    mapLabel: data.mapLabel ?? '',
    mobile: data.mobile ?? '',
    password: data.password ?? '',
    active: data.active !== false,
    betLocked: data.betLocked === true,
    balanceCurrent: Number(data.balanceCurrent) || 0,
    balanceEngaged: Number(data.balanceEngaged) || 0,
    commissionSession: Number(data.commissionSession) || 0,
    commissionMatch: Number(data.commissionMatch) || 0,
    createdAt: data.createdAt ?? Date.now(),
    updatedLimit: data.updatedLimit != null ? Number(data.updatedLimit) : undefined,
  }
}

function splitUsersDocs(snap) {
  const sas = []
  const agents = []
  const clients = []
  snap.forEach((d) => {
    const data = d.data()
    const role = data.role || roleFromPrefix(data.userId)
    if (role === 'super-admin') sas.push(docToSa(data))
    else if (role === 'admin') agents.push(docToAgent(data))
    else if (role === 'client') clients.push(docToClient(data))
  })
  return { sas, agents, clients }
}

export function isFirestoreEnabled() {
  return hasFirebaseConfig() && db != null
}

export function startFirestoreSync() {
  if (!isFirestoreEnabled() || started) return
  started = true
  const col = collection(db, USERS)
  unsubscribeUsers = onSnapshot(
    col,
    (snap) => {
      lastSyncError = null
      let { sas, agents, clients } = splitUsersDocs(snap)
      if (sas.length === 0 && agents.length === 0 && clients.length === 0) {
        const local = readLocalHierarchyPayload()
        if (local.sas.length || local.agents.length || local.clients.length) {
          sas = local.sas
          agents = local.agents
          clients = local.clients
        } else {
          const demo = ensurePanelDemoData()
          sas = demo.sas
          agents = demo.agents
          clients = demo.clients
          void seedUsersToFirestore(demo).catch((e) => console.error('[Firestore] auto-seed', e))
        }
      }
      setHierarchyCache({ sas, agents, clients, source: 'firestore' })
      mirrorHierarchyToLocal({ sas, agents, clients })
      notify()
    },
    (err) => {
      lastSyncError = err?.message || String(err)
      console.error('[Firestore] users listener error', err)
      notify()
    },
  )
}

export function stopFirestoreSync() {
  unsubscribeUsers?.()
  unsubscribeUsers = null
  started = false
}

function performedBy() {
  const s = readMasterSession()
  return s?.userId ?? null
}

export async function logTransaction(entry) {
  if (!isFirestoreEnabled()) return
  try {
    await addDoc(collection(db, TRANSACTIONS), {
      ...entry,
      createdAt: serverTimestamp(),
    })
  } catch (e) {
    console.error('[Firestore] logTransaction', e)
  }
}

export function rowToFirestoreUser(row, role) {
  const base = {
    userId: row.userId,
    role,
    name: row.name ?? '',
    password: row.password ?? '',
    mobile: row.mobile ?? '',
    active: row.active !== false,
    betLocked: row.betLocked === true,
    balanceCurrent: Number(row.balanceCurrent) || 0,
    balanceEngaged: Number(row.balanceEngaged) || 0,
    commissionSession: Number(row.commissionSession) || 0,
    commissionMatch: Number(row.commissionMatch) || 0,
    updatedAt: Date.now(),
  }
  if (role === 'super-admin') return base
  if (role === 'admin') {
    return { ...base, created_by_sa: row.created_by_sa ?? '' }
  }
  return {
    ...base,
    creditLimit: Number(row.creditLimit) || 0,
    updatedLimit:
      row.updatedLimit != null
        ? Number(row.updatedLimit)
        : Number(row.creditLimit) || 0,
    created_by_agent: row.created_by_agent ?? '',
    mapLabel: row.mapLabel ?? '',
    createdAt: row.createdAt ?? Date.now(),
  }
}

/** Create or replace user document. */
export async function upsertUser(row, role) {
  if (!isFirestoreEnabled()) return { ok: true }
  try {
    const id = String(row.userId).trim()
    const data = stripUndefined(rowToFirestoreUser(row, role))
    await setDoc(doc(db, USERS, id), data, { merge: true })
    await logTransaction({
      type: 'user_create',
      userId: id,
      role,
      amount: data.balanceCurrent,
      balanceAfter: data.balanceCurrent,
      creditLimit: data.creditLimit ?? null,
      updatedLimit: data.updatedLimit ?? null,
      performedBy: performedBy(),
      note: `New ${role} created`,
    })
    return { ok: true }
  } catch (e) {
    console.error('[Firestore] upsertUser', e)
    return { ok: false, error: e?.message || 'Firestore save failed' }
  }
}

/** Partial update + optional transaction log. */
export async function patchUserInFirestore(userId, partial, txMeta = null) {
  if (!isFirestoreEnabled()) return { ok: true }
  try {
    const id = String(userId).trim()
    const patch = stripUndefined({ ...partial, updatedAt: Date.now() })
    if (patch.creditLimit != null && patch.updatedLimit == null) {
      patch.updatedLimit = patch.creditLimit
    }
    await setDoc(doc(db, USERS, id), patch, { merge: true })
    if (txMeta) {
      await logTransaction({
        performedBy: performedBy(),
        userId: id,
        ...stripUndefined(txMeta),
      })
    }
    return { ok: true }
  } catch (e) {
    console.error('[Firestore] patchUser', e)
    return { ok: false, error: e?.message || 'Firestore update failed' }
  }
}

export async function seedUsersToFirestore({ sas, agents, clients }) {
  if (!isFirestoreEnabled()) return { ok: true }
  try {
    const batch = writeBatch(db)
    for (const s of sas) {
      batch.set(doc(db, USERS, s.userId), stripUndefined(rowToFirestoreUser(s, 'super-admin')))
    }
    for (const a of agents) {
      batch.set(doc(db, USERS, a.userId), stripUndefined(rowToFirestoreUser(a, 'admin')))
    }
    for (const c of clients) {
      batch.set(doc(db, USERS, c.userId), stripUndefined(rowToFirestoreUser(c, 'client')))
    }
    await batch.commit()
    return { ok: true }
  } catch (e) {
    console.error('[Firestore] seedUsers', e)
    return { ok: false, error: e?.message || 'Firestore seed failed' }
  }
}

export async function firestoreHasUsers() {
  if (!isFirestoreEnabled()) return false
  const snap = await getDocs(collection(db, USERS))
  return !snap.empty
}

export async function logBalanceDelta(userId, role, delta, balanceBefore, balanceAfter, note) {
  await logTransaction({
    type: delta >= 0 ? 'balance_add' : 'balance_minus',
    userId,
    role,
    delta,
    amount: Math.abs(delta),
    balanceBefore,
    balanceAfter,
    performedBy: performedBy(),
    note: note || (delta >= 0 ? 'Add coins' : 'Minus coins'),
  })
}

export async function logLimitUpdate(userId, role, before, after, fields = {}) {
  await logTransaction({
    type: 'limit_update',
    userId,
    role,
    balanceBefore: before.balance,
    balanceAfter: after.balance,
    creditLimitBefore: before.creditLimit ?? null,
    creditLimitAfter: after.creditLimit ?? null,
    updatedLimit: after.updatedLimit ?? after.creditLimit ?? null,
    performedBy: performedBy(),
    note: 'Limit / balance update',
    ...fields,
  })
}

export async function logTransfer(type, fromUserId, toUserId, amount, meta = {}) {
  await logTransaction({
    type,
    fromUserId,
    toUserId,
    amount,
    performedBy: performedBy(),
    ...meta,
  })
}
