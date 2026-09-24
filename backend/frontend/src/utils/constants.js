export const ROLES = {
  ADMIN: 'admin',
  JUDGE: 'judge',
  INVESTIGATOR: 'investigator',
  LEGAL_OFFICER: 'legalOfficer',
  POLICE: 'police',
}

export const normalizeRole = (role) => {
  if (!role) return 'admin'
  const r = role.toString().toUpperCase()
  if (r === 'ADMIN') return 'admin'
  if (r === 'OFFICER' || r === 'POLICE') return 'police'
  if (r === 'INVESTIGATOR') return 'investigator'
  if (r === 'LEGAL_OFFICER' || r === 'LEGALOFFICER' || r === 'LEGAL') return 'legalOfficer'
  if (r === 'JUDGE') return 'judge'
  return role.toLowerCase()
}

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.JUDGE]: 'Judge',
  [ROLES.INVESTIGATOR]: 'Investigator',
  [ROLES.LEGAL_OFFICER]: 'Legal Officer',
  [ROLES.POLICE]: 'Police Officer',
  ADMIN: 'Administrator',
  OFFICER: 'Police Officer',
  POLICE: 'Police Officer',
  INVESTIGATOR: 'Investigator',
  LEGAL_OFFICER: 'Legal Officer',
  JUDGE: 'Judge',
}

// Theme per role -> tailwind class fragments used across layout components
export const ROLE_THEME = {
  [ROLES.ADMIN]: {
    sidebarBg: 'bg-navy-900',
    sidebarActive: 'bg-navy-700',
    sidebarHover: 'hover:bg-navy-800',
    accent: 'text-gold-400',
    accentBg: 'bg-gold-500',
    accentBgHover: 'hover:bg-gold-600',
    accentText: 'text-navy-900',
    ring: 'focus:ring-gold-400',
    badgeBg: 'bg-gold-100',
    badgeText: 'text-gold-800',
    portalName: 'Judicial Document Management',
  },
  [ROLES.JUDGE]: {
    sidebarBg: 'bg-navy-900',
    sidebarActive: 'bg-navy-700',
    sidebarHover: 'hover:bg-navy-800',
    accent: 'text-gold-400',
    accentBg: 'bg-gold-500',
    accentBgHover: 'hover:bg-gold-600',
    accentText: 'text-navy-900',
    ring: 'focus:ring-gold-400',
    badgeBg: 'bg-gold-100',
    badgeText: 'text-gold-800',
    portalName: 'Judicial Access Portal',
  },
  [ROLES.INVESTIGATOR]: {
    sidebarBg: 'bg-navy-900',
    sidebarActive: 'bg-blue-600',
    sidebarHover: 'hover:bg-navy-800',
    accent: 'text-blue-400',
    accentBg: 'bg-blue-600',
    accentBgHover: 'hover:bg-blue-700',
    accentText: 'text-white',
    ring: 'focus:ring-blue-400',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    portalName: 'Investigator Access Portal',
  },
  [ROLES.LEGAL_OFFICER]: {
    sidebarBg: 'bg-forest-900',
    sidebarActive: 'bg-forest-600',
    sidebarHover: 'hover:bg-forest-800',
    accent: 'text-gold-400',
    accentBg: 'bg-gold-500',
    accentBgHover: 'hover:bg-gold-600',
    accentText: 'text-forest-900',
    ring: 'focus:ring-forest-400',
    badgeBg: 'bg-forest-100',
    badgeText: 'text-forest-800',
    portalName: 'Legal Officer Workspace',
  },
  [ROLES.POLICE]: {
    sidebarBg: 'bg-navy-900',
    sidebarActive: 'bg-navy-700',
    sidebarHover: 'hover:bg-navy-800',
    accent: 'text-gold-400',
    accentBg: 'bg-navy-700',
    accentBgHover: 'hover:bg-navy-800',
    accentText: 'text-white',
    ring: 'focus:ring-navy-400',
    badgeBg: 'bg-navy-100',
    badgeText: 'text-navy-800',
    portalName: 'Secure Document Management System for Police',
  },
}

export const STATUS_COLORS = {
  Verified: 'bg-emerald-100 text-emerald-700',
  Pending: 'bg-amber-100 text-amber-700',
  'Pending Review': 'bg-amber-100 text-amber-700',
  'Not Verified': 'bg-amber-100 text-amber-800 border border-amber-300',
  UNVERIFIED: 'bg-amber-100 text-amber-800 border border-amber-300',
  Rejected: 'bg-red-100 text-red-700',
  'Under Trial': 'bg-blue-100 text-blue-700',
  'Under Investigation': 'bg-blue-100 text-blue-700',
  Active: 'bg-emerald-100 text-emerald-700',
  Closed: 'bg-slate-200 text-slate-600',
  'In Court': 'bg-purple-100 text-purple-700',
  Fired: 'bg-red-100 text-red-700',
  Blocked: 'bg-red-100 text-red-700',
  Inactive: 'bg-slate-200 text-slate-600',
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-slate-200 text-slate-600',
  Healthy: 'bg-emerald-100 text-emerald-700',
  MOVEMENT_PENDING: 'bg-amber-100 text-amber-800 border border-amber-300 font-semibold',
  'Movement Pending Approval': 'bg-amber-100 text-amber-800 border border-amber-300 font-semibold',
  IN_STORAGE: 'bg-emerald-100 text-emerald-800',
  IN_TRANSIT: 'bg-orange-100 text-orange-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
}
