/** In-memory hierarchy mirror (Firestore onSnapshot + optimistic writes). */

let cache = {
  sas: [],
  agents: [],
  clients: [],
  ready: false,
  source: 'local',
}

export function getHierarchyCache() {
  return cache
}

export function setHierarchyCache({ sas, agents, clients, source = 'firestore' }) {
  cache = {
    sas: Array.isArray(sas) ? sas : [],
    agents: Array.isArray(agents) ? agents : [],
    clients: Array.isArray(clients) ? clients : [],
    ready: true,
    source,
  }
}

export function isCacheReady() {
  return cache.ready
}
