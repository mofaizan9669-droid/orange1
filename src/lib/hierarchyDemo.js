/**
 * Canonical demo tree for panels + Master lists (SA → Admin → Client map).
 */
import { createAllocator, getPanelDemoIdBlock, PANEL_DEMO_COUNTS } from './masterIdGen.js'

const LS_SA = 'crown-demo-superadmins'
const LS_AGENTS = 'crown-demo-agents'
const LS_CLIENTS = 'crown-clients-v1'

function readJson(key) {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const p = JSON.parse(raw)
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}

function panelLoginIds() {
  return {
    sa: String(import.meta.env.VITE_SA_USER ?? 'SA001').trim(),
    admin: String(import.meta.env.VITE_ADMIN_USER ?? 'ADM001').trim(),
    client: String(import.meta.env.VITE_CLIENT_USER ?? 'CL001').trim(),
  }
}

function uniqueIds(primary, pool, count, allocKind = 'sa') {
  const out = []
  const seen = new Set()
  const add = (id) => {
    const x = String(id || '').trim()
    if (!x || seen.has(x)) return
    seen.add(x)
    out.push(x)
  }
  add(primary)
  for (const id of pool) {
    if (out.length >= count) break
    add(id)
  }
  if (out.length < count) {
    const alloc = createAllocator(0xc7022027 ^ count, [...seen])
    const next =
      allocKind === 'sa'
        ? () => alloc.nextSuperAdminId()
        : allocKind === 'ag'
          ? () => alloc.nextAgentId()
          : () => alloc.nextClientId()
    while (out.length < count) add(next())
  }
  return out.slice(0, count)
}

function lineMapLabel(agentId, saId) {
  return `${agentId} → ${saId}`
}

/** Build 10 SA, 20 Admin, 50 Client (80 total) with panel login IDs on index 0. */
export function buildPanelDemoHierarchy() {
  const login = panelLoginIds()
  const block = getPanelDemoIdBlock()

  const saIds = uniqueIds(login.sa, block.sa, PANEL_DEMO_COUNTS.sa, 'sa')
  const agIds = uniqueIds(login.admin, block.ag, PANEL_DEMO_COUNTS.ag, 'ag')
  const clIds = uniqueIds(login.client, block.cl, PANEL_DEMO_COUNTS.cl, 'cl')

  const sas = saIds.map((userId, idx) => ({
    userId,
    name: idx === 0 ? 'Super Admin (Panel)' : `SA Line ${String.fromCharCode(65 + idx)}`,
    mobile: `9190${String(1000000 + idx).slice(-7)}`,
    password: 'sa123',
    active: true,
    betLocked: false,
    balanceCurrent: 1800000 + idx * 240000,
    balanceEngaged: 0,
    commissionSession: 0,
    commissionMatch: 0,
  }))

  const agents = agIds.map((userId, idx) => {
    const saId = saIds[idx % saIds.length]
    return {
      userId,
      name: idx === 0 ? 'Admin (Panel)' : `Admin ${idx + 1}`,
      created_by_sa: saId,
      mobile: `9198${String(1000000 + idx).slice(-7)}`,
      password: 'admin123',
      active: true,
      betLocked: false,
      balanceCurrent: 90000 + idx * 28000,
      balanceEngaged: 0,
      commissionSession: 1,
      commissionMatch: 1,
    }
  })

  const now = Date.now()
  const clients = clIds.map((userId, i) => {
    const agent = agents[i % agents.length]
    const lim = 7000 + (i % 20) * 1600
    return {
      userId,
      name: i === 0 ? 'Client (Panel)' : `Client ${i + 1}`,
      creditLimit: lim,
      updatedLimit: lim,
      created_by_agent: agent.userId,
      mapLabel: lineMapLabel(agent.userId, agent.created_by_sa),
      mobile: `9197${String(1000000 + i).slice(-7)}`,
      password: 'client123',
      active: true,
      betLocked: false,
      balanceCurrent: lim,
      balanceEngaged: 0,
      commissionSession: 2,
      commissionMatch: 2,
      createdAt: now + i,
    }
  })

  return { sas, agents, clients, login }
}

export function writePanelDemoToLocal() {
  if (typeof window === 'undefined') return buildPanelDemoHierarchy()
  const demo = buildPanelDemoHierarchy()
  window.localStorage.setItem(LS_SA, JSON.stringify(demo.sas))
  window.localStorage.setItem(LS_AGENTS, JSON.stringify(demo.agents))
  window.localStorage.setItem(LS_CLIENTS, JSON.stringify(demo.clients))
  return demo
}

export function readLocalHierarchyPayload() {
  return {
    sas: readJson(LS_SA),
    agents: readJson(LS_AGENTS),
    clients: readJson(LS_CLIENTS),
  }
}

export function localHierarchyIsEmpty() {
  const { sas, agents, clients } = readLocalHierarchyPayload()
  return sas.length === 0 && agents.length === 0 && clients.length === 0
}

export function expectedDemoUserCount() {
  return PANEL_DEMO_COUNTS.sa + PANEL_DEMO_COUNTS.ag + PANEL_DEMO_COUNTS.cl
}

/** Local demo matches full panel tree (10 + 20 + 50). */
export function isPanelDemoComplete(payload = readLocalHierarchyPayload()) {
  return (
    payload.sas.length >= PANEL_DEMO_COUNTS.sa &&
    payload.agents.length >= PANEL_DEMO_COUNTS.ag &&
    payload.clients.length >= PANEL_DEMO_COUNTS.cl
  )
}

/** Bump when demo size / shape changes — Firestore meta + local reseed. */
export const DEMO_SCHEMA_VERSION = '8'

/** Restore demo if missing or incomplete; returns payload for Firestore seed. */
export function ensurePanelDemoData() {
  if (typeof window === 'undefined') return buildPanelDemoHierarchy()
  if (!isPanelDemoComplete()) return writePanelDemoToLocal()
  return readLocalHierarchyPayload()
}

export { panelLoginIds, PANEL_DEMO_COUNTS }
