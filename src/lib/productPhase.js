/**
 * Product phase: Master panel first; role portals (/superadmin, /admin, /client) later.
 * Enable with VITE_ENABLE_ROLE_PANELS=true in .env
 */
export const ROLE_PANELS_ENABLED = import.meta.env.VITE_ENABLE_ROLE_PANELS === 'true'

export const MASTER_ONLY_LABEL = 'Abhi sirf Master panel — Super Admin / Admin / Client portals baad mein.'
