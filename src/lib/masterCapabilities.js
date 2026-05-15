import { readMasterSession } from './masterAuth.js'
import { ensureHierarchySeeded, readAgentsSnapshot, readSuperAdminsSnapshot } from './hierarchySnapshot.js'

/** Who can create what: Master owner = Super Admin only; Super Admin = Admin + Client; Admin = Client only. */
export function getMasterCreateCaps() {
  if (typeof window === 'undefined') {
    return {
      canCreateSuperAdmin: false,
      canCreateAdmin: false,
      canCreateClient: false,
      sessionUserId: null,
      isOwner: false,
    }
  }
  ensureHierarchySeeded()
  const s = readMasterSession()
  if (!s?.userId) {
    return {
      canCreateSuperAdmin: false,
      canCreateAdmin: false,
      canCreateClient: false,
      sessionUserId: null,
      isOwner: false,
    }
  }
  if (s.isOwner === true) {
    return {
      canCreateSuperAdmin: true,
      canCreateAdmin: false,
      canCreateClient: false,
      sessionUserId: s.userId,
      isOwner: true,
    }
  }
  const uid = s.userId
  const sas = readSuperAdminsSnapshot()
  const ags = readAgentsSnapshot()
  if (sas.some((x) => x.userId === uid)) {
    return {
      canCreateSuperAdmin: false,
      canCreateAdmin: true,
      canCreateClient: true,
      sessionUserId: uid,
      isOwner: false,
    }
  }
  if (ags.some((x) => x.userId === uid)) {
    return {
      canCreateSuperAdmin: false,
      canCreateAdmin: false,
      canCreateClient: true,
      sessionUserId: uid,
      isOwner: false,
    }
  }
  return {
    canCreateSuperAdmin: false,
    canCreateAdmin: false,
    canCreateClient: false,
    sessionUserId: uid,
    isOwner: false,
  }
}

/** Admins under current session line (for client create dropdown). */
export function filterAgentsForClientCreate(caps) {
  ensureHierarchySeeded()
  const ags = readAgentsSnapshot()
  if (!caps?.sessionUserId) return ags
  if (caps.isOwner) return ags
  const sas = readSuperAdminsSnapshot()
  if (sas.some((s) => s.userId === caps.sessionUserId)) {
    return ags.filter((a) => a.created_by_sa === caps.sessionUserId)
  }
  return ags.filter((a) => a.userId === caps.sessionUserId)
}
