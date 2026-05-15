/**
 * Master hierarchy IDs (auto-style):
 * - Super Admin: SA + 4–6 digits (seeded / random pool)
 * - Admin:       AG + 4–6 digits
 * - Client:      CL + 5–6 digits
 *
 * Seeded allocator = stable demo block for empty DB + env fallbacks.
 */

const DEMO_SEED = 0xc7022026

function mulberry32(seed) {
  let a = seed >>> 0
  return function rand() {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createAllocator(seed, initialIds = []) {
  const rnd = mulberry32(seed)
  const ri = (min, max) => min + Math.floor(rnd() * (max - min + 1))
  const taken = new Set(initialIds)

  function digitString(len) {
    let s = ''
    for (let i = 0; i < len; i += 1) {
      s += i === 0 ? String(ri(1, 9)) : String(ri(0, 9))
    }
    return s
  }

  function nextId(prefix, digitMin, digitMax) {
    let id
    let guard = 0
    do {
      const L = ri(digitMin, digitMax)
      id = prefix + digitString(L)
      guard += 1
    } while (taken.has(id) && guard < 2000)
    taken.add(id)
    return id
  }

  return {
    nextSuperAdminId: () => nextId('SA', 4, 6),
    nextAgentId: () => nextId('AG', 4, 6),
    nextClientId: () => nextId('CL', 5, 6),
    taken,
  }
}

/** Panel + lists: 7 SA + 15 Admin + 38 Client = 60 demo logins (mapped tree). */
export const PANEL_DEMO_COUNTS = { sa: 7, ag: 15, cl: 38 }

/** Full demo tree IDs (stable seed). */
export function getLargeDemoIdBlock() {
  const a = createAllocator(DEMO_SEED)
  const { sa, ag, cl } = PANEL_DEMO_COUNTS
  return {
    sa: Array.from({ length: sa }, () => a.nextSuperAdminId()),
    ag: Array.from({ length: ag }, () => a.nextAgentId()),
    cl: Array.from({ length: cl }, () => a.nextClientId()),
  }
}

/** Stable demo IDs for panel seed (same on every fresh seed). */
export function getPanelDemoIdBlock() {
  return getLargeDemoIdBlock()
}

/** @deprecated — use getPanelDemoIdBlock */
export function getFrozenDemoIdBlock() {
  return getPanelDemoIdBlock()
}

/** New IDs at runtime; pass all existing userIds from storage. */
export function allocateNewIds(existingIds) {
  const seed = (Date.now() ^ (Math.random() * 0x100000000)) >>> 0
  return createAllocator(seed, existingIds)
}

/** Stable IDs for env fallbacks / cricket demo — first row = panel login (.env). */
export const DEMO_ROLE_IDS = (() => {
  const frozen = getPanelDemoIdBlock()
  const sa0 = String(typeof import.meta !== 'undefined' && import.meta.env?.VITE_SA_USER
    ? import.meta.env.VITE_SA_USER
    : 'SA001').trim()
  const ag0 = String(typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_USER
    ? import.meta.env.VITE_ADMIN_USER
    : 'ADM001').trim()
  const cl0 = String(typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLIENT_USER
    ? import.meta.env.VITE_CLIENT_USER
    : 'CL001').trim()
  return {
    sa: [sa0, ...frozen.sa.filter((id) => id !== sa0)].slice(0, frozen.sa.length),
    ag: [ag0, ...frozen.ag.filter((id) => id !== ag0)].slice(0, frozen.ag.length),
    cl: [cl0, ...frozen.cl.filter((id) => id !== cl0)].slice(0, frozen.cl.length),
  }
})()
