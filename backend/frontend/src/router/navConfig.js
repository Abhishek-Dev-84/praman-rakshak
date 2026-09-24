import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Building2,
  Briefcase,
  FileText,
  History,
  BarChart3,
  BellRing,
  Activity,
  Settings,
  DatabaseBackup,
  User,
  Gavel,
  ClipboardList,
  Search,
  FolderOpen,
  UploadCloud,
  Users2,
} from 'lucide-react'

export const adminNav = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/roles', label: 'Roles & Permissions', icon: ShieldCheck },
  { to: '/admin/departments', label: 'Departments', icon: Building2 },
  { to: '/admin/cases', label: 'Cases', icon: Briefcase },
  { to: '/admin/documents', label: 'Documents', icon: FileText },
  { to: '/admin/evidence', label: 'Evidence Management', icon: FolderOpen },
  { to: '/admin/audit-trail', label: 'Audit Trail', icon: History },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/alerts', label: 'Alerts', icon: BellRing },
  { to: '/admin/system-health', label: 'System Health', icon: Activity },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/backup', label: 'Backup & Restore', icon: DatabaseBackup },
  { to: '/admin/profile', label: 'Profile', icon: User },
]
export const adminBottomNav = [
  adminNav[0],
  adminNav[1],
  adminNav[4],
  adminNav[6],
  adminNav[7],
  adminNav[13],
]

export const judgeNav = [
  { to: '/judge/docket', label: 'Docket', icon: LayoutDashboard, end: true },
  { to: '/judge/review', label: 'Review', icon: FileText },
  { to: '/judge/search', label: 'Search', icon: Search },
  { to: '/judge/profile', label: 'Profile', icon: User },
]
export const judgeBottomNav = judgeNav

export const investigatorNav = [
  { to: '/investigator/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/investigator/cases', label: 'Cases', icon: Briefcase },
  { to: '/investigator/documents', label: 'Documents', icon: FileText },
  { to: '/investigator/evidence', label: 'Evidence', icon: FolderOpen },
  { to: '/investigator/tasks', label: 'Tasks', icon: ClipboardList },
  { to: '/investigator/profile', label: 'Profile', icon: User },
]
export const investigatorBottomNav = [
  investigatorNav[0],
  investigatorNav[1],
  investigatorNav[2],
  investigatorNav[4],
  investigatorNav[5],
]

export const legalNav = [
  { to: '/legal/cases', label: 'My Cases', icon: Briefcase, end: true },
  { to: '/legal/documents', label: 'Documents', icon: FileText },
  { to: '/legal/workspace', label: 'Collaborative Workspace', icon: Users2 },
  { to: '/legal/templates', label: 'Legal Templates', icon: ClipboardList },
  { to: '/legal/profile', label: 'Profile', icon: User },
]
export const legalBottomNav = [
  legalNav[0],
  legalNav[1],
  legalNav[2],
  legalNav[3],
  legalNav[4],
]

export const policeNav = [
  { to: '/police/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/police/cases', label: 'My Cases', icon: Briefcase },
  { to: '/police/documents', label: 'Documents', icon: FileText },
  { to: '/police/evidence', label: 'Physical Evidence', icon: FolderOpen },
  { to: '/police/upload', label: 'Upload Document', icon: UploadCloud },
  { to: '/police/reports', label: 'Reports', icon: BarChart3 },
  { to: '/police/alerts', label: 'Alerts', icon: BellRing },
  { to: '/police/profile', label: 'Profile', icon: User },
]
export const policeBottomNav = [
  policeNav[0],
  policeNav[1],
  policeNav[2],
  policeNav[5],
  policeNav[6],
]

export { Gavel }
