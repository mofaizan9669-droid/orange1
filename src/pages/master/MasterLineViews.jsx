import { Outlet } from 'react-router-dom'
import MasterGreenExchangeList from './MasterGreenExchangeList.jsx'

export function MasterSuperAdminsOutlet() {
  return <Outlet />
}

export function MasterSuperAdminsPage() {
  return <MasterGreenExchangeList variant="super-admin" />
}

export function MasterAdminsPage() {
  return <MasterGreenExchangeList variant="admin" />
}

export function MasterClientsPage() {
  return <MasterGreenExchangeList variant="client" />
}
