/** Client rows — Firestore cache when synced, else localStorage. */
import { getHierarchyCache, isCacheReady } from './hierarchyCache.js'
import { isFirestoreEnabled, upsertUser } from './firestoreSync.js'

const LS_CLIENTS = 'crown-clients-v1'

export function readClientsLocal() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LS_CLIENTS)
    if (!raw) return []
    const p = JSON.parse(raw)
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}

export function readClients() {
  if (isCacheReady()) {
    const c = getHierarchyCache().clients
    if (c.length > 0) return c
  }
  return readClientsLocal()
}

export function writeClients(list) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LS_CLIENTS, JSON.stringify(list))
    window.dispatchEvent(new CustomEvent('crown-hierarchy-demo-changed'))
  } catch {
    /* ignore */
  }
}

export function addClientForAgent(agentId, row) {
  const list = readClients()
  const full = {
    ...row,
    created_by_agent: agentId,
    createdAt: Date.now(),
    updatedLimit: row.updatedLimit ?? row.creditLimit ?? row.balanceCurrent ?? 0,
  }
  list.push(full)
  writeClients(list)
  if (isFirestoreEnabled()) {
    void upsertUser(full, 'client').catch((e) => console.error('[Firestore] addClientForAgent', e))
  }
}
