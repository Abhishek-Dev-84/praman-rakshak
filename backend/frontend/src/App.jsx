import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { UIProvider } from './context/UIContext'
import Toaster from './components/common/Toaster'
import RequireRole from './router/RequireRole'
import DashboardLayout from './components/layout/DashboardLayout'
import { ROLES } from './utils/constants'
import {
  adminNav,
  adminBottomNav,
  judgeNav,
  judgeBottomNav,
  investigatorNav,
  investigatorBottomNav,
  legalNav,
  legalBottomNav,
  policeNav,
  policeBottomNav,
} from './router/navConfig'

import PortalSelect from './pages/auth/PortalSelect'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import NotFound from './pages/NotFound'

import AdminDashboard from './pages/admin/Dashboard'
import UsersManagement from './pages/admin/UsersManagement'
import RolesPermissions from './pages/admin/RolesPermissions'
import Departments from './pages/admin/Departments'
import AdminCases from './pages/admin/AdminCases'
import AdminReports from './pages/admin/AdminReports'
import AdminAlerts from './pages/admin/AdminAlerts'
import SystemHealth from './pages/admin/SystemHealth'
import AdminSettings from './pages/admin/AdminSettings'
import BackupRestore from './pages/admin/BackupRestore'

import JudgeDocket from './pages/judge/JudgeDocket'
import JudgeReview from './pages/judge/JudgeReview'
import JudgeSearch from './pages/judge/JudgeSearch'

import InvestigatorDashboard from './pages/investigator/InvestigatorDashboard'
import InvestigatorCases from './pages/investigator/InvestigatorCases'
import CreateDocument from './pages/investigator/CreateDocument'
import InvestigatorTasks from './pages/investigator/InvestigatorTasks'
import EvidenceManagement from './pages/investigator/EvidenceManagement'

import LegalCases from './pages/legalOfficer/LegalCases'
import CollaborativeWorkspace from './pages/legalOfficer/CollaborativeWorkspace'
import LegalTemplates from './pages/legalOfficer/LegalTemplates'

import PoliceDashboard from './pages/police/PoliceDashboard'
import PoliceCases from './pages/police/PoliceCases'
import PoliceUpload from './pages/police/PoliceUpload'
import PoliceReports from './pages/police/PoliceReports'

import SharedCaseDetail from './pages/shared/SharedCaseDetail'
import SharedDocuments from './pages/shared/SharedDocuments'
import SharedDocumentReview from './pages/shared/SharedDocumentReview'
import SharedAuditTrail from './pages/shared/SharedAuditTrail'
import SharedProfile from './pages/shared/SharedProfile'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UIProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<PortalSelect />} />
            <Route path="/login/:role" element={<Login />} />
            <Route path="/register/:role" element={<Register />} />

            {/* Admin */}
            <Route element={<RequireRole roles={[ROLES.ADMIN]} />}>
              <Route
                element={<DashboardLayout role={ROLES.ADMIN} navItems={adminNav} bottomNavItems={adminBottomNav} />}
              >
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<UsersManagement />} />
                <Route path="/admin/roles" element={<RolesPermissions />} />
                <Route path="/admin/departments" element={<Departments />} />
                <Route path="/admin/cases" element={<AdminCases />} />
                <Route
                  path="/admin/cases/:caseId"
                  element={<SharedCaseDetail basePath="/admin" documentBasePath="/admin/documents" />}
                />
                <Route path="/admin/documents" element={<SharedDocuments basePath="/admin" title="All Documents" />} />
                <Route
                  path="/admin/documents/:docId"
                  element={<SharedDocumentReview canDelete canRequestClarification />}
                />
                <Route path="/admin/evidence" element={<EvidenceManagement />} />
                <Route path="/admin/audit-trail" element={<SharedAuditTrail showChainDemo />} />
                <Route path="/admin/reports" element={<AdminReports />} />
                <Route path="/admin/alerts" element={<AdminAlerts />} />
                <Route path="/admin/system-health" element={<SystemHealth />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin/backup" element={<BackupRestore />} />
                <Route path="/admin/profile" element={<SharedProfile />} />
              </Route>
            </Route>

            {/* Judge */}
            <Route element={<RequireRole roles={[ROLES.JUDGE]} />}>
              <Route
                element={<DashboardLayout role={ROLES.JUDGE} navItems={judgeNav} bottomNavItems={judgeBottomNav} />}
              >
                <Route path="/judge/docket" element={<JudgeDocket />} />
                <Route path="/judge/review" element={<JudgeReview />} />
                <Route
                  path="/judge/review/:docId"
                  element={<SharedDocumentReview canSign canRequestClarification signLabel="Sign & Approve for Record" />}
                />
                <Route
                  path="/judge/cases/:caseId"
                  element={<SharedCaseDetail basePath="/judge" documentBasePath="/judge/review" />}
                />
                <Route path="/judge/search" element={<JudgeSearch />} />
                <Route path="/judge/audit-trail" element={<SharedAuditTrail showChainDemo />} />
                <Route path="/judge/profile" element={<SharedProfile />} />
              </Route>
            </Route>

            {/* Investigator */}
            <Route element={<RequireRole roles={[ROLES.INVESTIGATOR]} />}>
              <Route
                element={
                  <DashboardLayout role={ROLES.INVESTIGATOR} navItems={investigatorNav} bottomNavItems={investigatorBottomNav} />
                }
              >
                <Route path="/investigator/dashboard" element={<InvestigatorDashboard />} />
                <Route path="/investigator/cases" element={<InvestigatorCases />} />
                <Route
                  path="/investigator/cases/:caseId"
                  element={<SharedCaseDetail basePath="/investigator" documentBasePath="/investigator/documents" />}
                />
                <Route
                  path="/investigator/documents"
                  element={<SharedDocuments basePath="/investigator" title="Documents" />}
                />
                <Route
                  path="/investigator/documents/:docId"
                  element={<SharedDocumentReview canSign signLabel="Verify & Submit for Record" />}
                />
                <Route path="/investigator/create-document" element={<CreateDocument />} />
                <Route path="/investigator/tasks" element={<InvestigatorTasks />} />
                <Route path="/investigator/evidence" element={<EvidenceManagement />} />
                <Route path="/investigator/profile" element={<SharedProfile />} />
              </Route>
            </Route>

            {/* Legal Officer */}
            <Route element={<RequireRole roles={[ROLES.LEGAL_OFFICER]} />}>
              <Route
                element={<DashboardLayout role={ROLES.LEGAL_OFFICER} navItems={legalNav} bottomNavItems={legalBottomNav} />}
              >
                <Route path="/legal/cases" element={<LegalCases />} />
                <Route
                  path="/legal/cases/:caseId"
                  element={<SharedCaseDetail basePath="/legal" documentBasePath="/legal/documents" />}
                />
                <Route path="/legal/documents" element={<SharedDocuments basePath="/legal" title="Documents" />} />
                <Route
                  path="/legal/documents/:docId"
                  element={<SharedDocumentReview canRequestClarification />}
                />
                <Route path="/legal/workspace" element={<CollaborativeWorkspace />} />
                <Route path="/legal/templates" element={<LegalTemplates />} />
                <Route path="/legal/audit-trail" element={<SharedAuditTrail />} />
                <Route path="/legal/profile" element={<SharedProfile />} />
              </Route>
            </Route>

            {/* Police */}
            <Route element={<RequireRole roles={[ROLES.POLICE]} />}>
              <Route
                element={<DashboardLayout role={ROLES.POLICE} navItems={policeNav} bottomNavItems={policeBottomNav} />}
              >
                <Route path="/police/dashboard" element={<PoliceDashboard />} />
                <Route path="/police/cases" element={<PoliceCases />} />
                <Route
                  path="/police/cases/:caseId"
                  element={<SharedCaseDetail basePath="/police" documentBasePath="/police/documents" />}
                />
                <Route path="/police/documents" element={<SharedDocuments basePath="/police" title="Documents" />} />
                <Route path="/police/documents/:docId" element={<SharedDocumentReview />} />
                <Route path="/police/evidence" element={<EvidenceManagement />} />
                <Route path="/police/upload" element={<PoliceUpload />} />
                <Route path="/police/reports" element={<PoliceReports />} />
                <Route path="/police/audit-trail" element={<SharedAuditTrail />} />
                <Route path="/police/alerts" element={<AdminAlerts />} />
                <Route path="/police/profile" element={<SharedProfile />} />
              </Route>
            </Route>

            {/* Generic /profile redirect based on role handled inside each RequireRole block above */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </UIProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
