import { ROLE_PANELS_ENABLED } from '../lib/productPhase.js'
import RolePanelsComingSoon from '../pages/RolePanelsComingSoon.jsx'

/** Renders role portal routes only when VITE_ENABLE_ROLE_PANELS=true. */
export default function RolePanelsGate({ children }) {
  if (!ROLE_PANELS_ENABLED) return <RolePanelsComingSoon />
  return children
}
