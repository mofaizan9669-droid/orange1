import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './crown.css'
import FirestoreBootstrap from './components/FirestoreBootstrap.jsx'
import RequireMaster from './components/RequireMaster.jsx'
import RequireOwner from './components/RequireOwner.jsx'
import MasterShell from './layouts/MasterShell.jsx'
import Home from './pages/Home.jsx'
import MasterLogin from './pages/MasterLogin.jsx'
import MasterHome from './pages/master/MasterHome.jsx'
import HierarchyPage from './pages/master/HierarchyPage.jsx'
import {
  LeaderboardPage,
  LedgerPage,
  LiveBetsPage,
  LiveMatchesPage,
  OldDataPage,
  ReportsPage,
  SettlementPage,
  SportsPage,
} from './pages/master/MasterPages.jsx'
import GreenPage from './pages/master/GreenPage.jsx'
import { MasterSaAdminProfile, MasterSaClientProfile, MasterSaProfile } from './pages/master/MasterSaHierarchyProfiles.jsx'
import {
  MasterAdminsPage,
  MasterClientsPage,
  MasterSuperAdminsOutlet,
  MasterSuperAdminsPage,
} from './pages/master/MasterLineViews.jsx'
import RolePanelsGate from './components/RolePanelsGate.jsx'
import SuperAdminEntry from './pages/SuperAdminEntry.jsx'
import AdminEntry from './pages/AdminEntry.jsx'
import ClientEntry from './pages/ClientEntry.jsx'
import { isMasterLoggedIn, readMasterSession } from './lib/masterAuth.js'
import { getMasterPanelHome, masterLegacyRedirectPath, remapMastersPathname } from './lib/masterPaths.js'

function RootRedirect() {
  if (!isMasterLoggedIn()) return <Navigate to="/login" replace />
  return <Navigate to={getMasterPanelHome()} replace />
}

function LegacyMastersUrlRedirect() {
  const location = useLocation()
  if (!isMasterLoggedIn()) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Navigate to={remapMastersPathname(location.pathname, readMasterSession()?.userId)} replace />
}

function LegacyMasterDashboardRedirect() {
  const location = useLocation()
  if (!isMasterLoggedIn()) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  const s = readMasterSession()
  const dest = masterLegacyRedirectPath(location.pathname, s.userId)
  return <Navigate to={dest} replace />
}

export default function App() {
  return (
    <>
      <FirestoreBootstrap />
      <Routes>
      <Route path="/login" element={<MasterLogin />} />
      <Route path="/" element={<RootRedirect />} />
      <Route path="/home" element={<Home />} />

      <Route path="/master-dashboard" element={<LegacyMasterDashboardRedirect />} />
      <Route path="/master-dashboard/*" element={<LegacyMasterDashboardRedirect />} />
      <Route path="/masters/*" element={<LegacyMastersUrlRedirect />} />
      <Route path="/masters" element={<Navigate to={getMasterPanelHome()} replace />} />

      <Route element={<RequireMaster />}>
        <Route path="/master" element={<MasterShell />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<MasterHome />} />
          <Route
            path="hierarchy"
            element={
              <RequireOwner>
                <HierarchyPage />
              </RequireOwner>
            }
          />
          <Route path="green" element={<GreenPage />} />
          <Route path="live-bets" element={<LiveBetsPage />} />
          <Route path="live-matches" element={<LiveMatchesPage />} />
          <Route path="master/super-admins" element={<MasterSuperAdminsOutlet />}>
            <Route index element={<MasterSuperAdminsPage />} />
            <Route path=":saId/admins/:adminId/clients/:clientId" element={<MasterSaClientProfile />} />
            <Route path=":saId/admins/:adminId" element={<MasterSaAdminProfile />} />
            <Route path=":saId" element={<MasterSaProfile />} />
          </Route>
          <Route path="master/admins" element={<MasterAdminsPage />} />
          <Route path="master/clients" element={<MasterClientsPage />} />
          <Route path="settlement" element={<SettlementPage />} />
          <Route path="sports" element={<SportsPage />} />
          <Route path="ledger" element={<LedgerPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="old-data" element={<OldDataPage />} />
        </Route>
      </Route>

      <Route
        path="/superadmin"
        element={
          <RolePanelsGate>
            <SuperAdminEntry />
          </RolePanelsGate>
        }
      />
      <Route
        path="/superadmin/:userId"
        element={
          <RolePanelsGate>
            <SuperAdminEntry />
          </RolePanelsGate>
        }
      />
      <Route
        path="/admin"
        element={
          <RolePanelsGate>
            <AdminEntry />
          </RolePanelsGate>
        }
      />
      <Route
        path="/admin/:userId"
        element={
          <RolePanelsGate>
            <AdminEntry />
          </RolePanelsGate>
        }
      />
      <Route
        path="/client"
        element={
          <RolePanelsGate>
            <ClientEntry />
          </RolePanelsGate>
        }
      />
      <Route
        path="/client/:userId"
        element={
          <RolePanelsGate>
            <ClientEntry />
          </RolePanelsGate>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}
