import { ROLES } from '../utils/constants'

// Demo accounts — used by the mock auth service.
// Password for every account is: Demo@123
export const USERS = [
  {
    id: 'ADM001',
    userId: 'admin@gov.in',
    password: 'Demo@123',
    name: 'Super Administrator',
    role: ROLES.ADMIN,
    designation: 'Super Admin',
    department: 'Ministry of Home Affairs',
    mobile: '+91 98765 43210',
    joinedOn: '10 Jan 2024',
    avatarInitials: 'SA',
  },
  {
    id: 'JUD-2210',
    userId: 'justice.verma',
    password: 'Demo@123',
    name: 'Hon. Justice A. Verma',
    role: ROLES.JUDGE,
    designation: 'Judge',
    department: 'High Court of Delhi, Sessions Court',
    mobile: '+91 98011 22334',
    joinedOn: '02 Feb 2019',
    avatarInitials: 'AV',
  },
  {
    id: 'INV-2458',
    userId: 'arjun.singh',
    password: 'Demo@123',
    name: 'Insp. Arjun Singh',
    role: ROLES.INVESTIGATOR,
    designation: 'Investigating Officer',
    department: 'Delhi Police',
    mobile: '+91 99887 76655',
    joinedOn: '14 Mar 2021',
    avatarInitials: 'AS',
  },
  {
    id: 'LGL-3092',
    userId: 'neha.legal',
    password: 'Demo@123',
    name: 'Neha Gupta',
    role: ROLES.LEGAL_OFFICER,
    designation: 'Legal Officer',
    department: 'Legal Department, MHA',
    mobile: '+91 90123 45678',
    joinedOn: '21 Jun 2022',
    avatarInitials: 'NG',
  },
  {
    id: 'PO1234',
    userId: 'ramesh.po',
    password: 'Demo@123',
    name: 'Inspector Ramesh',
    role: ROLES.POLICE,
    designation: 'Police Officer',
    department: 'MG Road PS, Delhi Police',
    mobile: '+91 98765 12340',
    joinedOn: '10 Jan 2024',
    avatarInitials: 'IR',
  },
]

export const findUserByCredentials = (userId, password) =>
  USERS.find(
    (u) => u.userId.toLowerCase() === userId.trim().toLowerCase() && u.password === password
  )

export const findUserByRole = (role) => USERS.find((u) => u.role === role)
