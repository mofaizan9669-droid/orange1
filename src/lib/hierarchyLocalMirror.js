/** Keep localStorage in sync when Firestore snapshot updates (offline fallback). */
const LS_SA = 'crown-demo-superadmins'
const LS_AGENTS = 'crown-demo-agents'
const LS_CLIENTS = 'crown-clients-v1'

export function mirrorHierarchyToLocal({ sas, agents, clients }) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LS_SA, JSON.stringify(sas ?? []))
    window.localStorage.setItem(LS_AGENTS, JSON.stringify(agents ?? []))
    window.localStorage.setItem(LS_CLIENTS, JSON.stringify(clients ?? []))
  } catch {
    /* ignore quota errors */
  }
}
