export const TASKS = [
  {
    id: 1,
    title: 'Collect CCTV Footage — Connaught Place',
    caseId: 'CR-2291',
    due: '12 May 2025',
    priority: 'High',
    done: true,
    createdBy: 'Insp. Arjun Singh',
  },
  {
    id: 2,
    title: 'Get FSL Confirmation on Blood Sample',
    caseId: 'CR-2291',
    due: '14 May 2025',
    priority: 'Medium',
    done: true,
    createdBy: 'Insp. Arjun Singh',
  },
  {
    id: 3,
    title: 'Record Statement — Witness (John Doe)',
    caseId: 'CR-2291',
    due: '16 May 2025',
    priority: 'Low',
    done: true,
    createdBy: 'Insp. Arjun Singh',
  },
  {
    id: 4,
    title: 'Verify Call Records of Accused',
    caseId: 'CR-2291',
    due: '18 May 2025',
    priority: 'Medium',
    done: true,
    createdBy: 'Insp. Arjun Singh',
  },
  {
    id: 5,
    title: 'Prepare Case Brief for Court',
    caseId: 'CR-2291',
    due: '20 May 2025',
    priority: 'High',
    done: false,
    createdBy: 'Insp. Arjun Singh',
  },
  {
    id: 6,
    title: 'Cross-check Forensic Timeline',
    caseId: 'CR-2210',
    due: '25 May 2025',
    priority: 'Medium',
    done: false,
    createdBy: 'Insp. Arjun Singh',
  },
]

export const EVIDENCE = [
  {
    id: 1,
    name: 'Blood Sample — Seized from Crime Scene',
    type: 'Biological',
    caseId: 'CR-2291',
    collectedOn: '02 May 2025',
    status: 'Verified',
  },
  {
    id: 2,
    name: 'Knife — Seized from Accused',
    type: 'Physical',
    caseId: 'CR-2291',
    collectedOn: '03 May 2025',
    status: 'Verified',
  },
  {
    id: 3,
    name: 'CCTV Footage — Main Road',
    type: 'Digital',
    caseId: 'CR-2291',
    collectedOn: '04 May 2025',
    status: 'Pending',
  },
  {
    id: 4,
    name: 'Mobile Phone — Accused',
    type: 'Digital',
    caseId: 'CR-2291',
    collectedOn: '04 May 2025',
    status: 'Verified',
  },
  {
    id: 5,
    name: 'Footwear Impression Photo',
    type: 'Other',
    caseId: 'CR-2291',
    collectedOn: '02 May 2025',
    status: 'Verified',
  },
]

export const ALERTS = [
  {
    id: 1,
    severity: 'High',
    title: 'Unusual login attempt detected',
    detail: 'Multiple failed login attempts from 203.0.113.45',
    time: '21 May 2025, 10:32 AM',
  },
  {
    id: 2,
    severity: 'Medium',
    title: 'Multiple downloads detected',
    detail: '10 documents downloaded in short time',
    time: '21 May 2025, 10:05 AM',
  },
  {
    id: 3,
    severity: 'High',
    title: 'Unauthorized access blocked',
    detail: 'Access denied for document FIR2025_0156_FIR.pdf',
    time: '21 May 2025, 09:45 AM',
  },
  {
    id: 4,
    severity: 'Low',
    title: 'Document integrity verified',
    detail: 'FIR2025_0156_FIR.pdf integrity verified successfully',
    time: '21 May 2025, 09:30 AM',
  },
  {
    id: 5,
    severity: 'Medium',
    title: 'New document shared',
    detail: 'Forensic_Report_01.pdf shared with FSL User',
    time: '21 May 2025, 09:15 AM',
  },
  {
    id: 6,
    severity: 'Low',
    title: 'System backup completed',
    detail: 'Daily system backup completed successfully',
    time: '21 May 2025, 02:00 AM',
  },
  {
    id: 7,
    severity: 'Medium',
    title: 'Unusual access pattern detected',
    detail: 'Investigator X viewed 40 documents at 2 AM',
    time: '20 May 2025, 02:14 AM',
  },
]

export const NOTIFICATIONS = [
  { id: 1, title: 'Bail Order — Case #CR-2291 awaiting signature', time: '5 min ago', unread: true },
  { id: 2, title: 'New document uploaded to CR-2210', time: '1 hr ago', unread: true },
  { id: 3, title: 'Tampering detected on CR-2291 record', time: '2 hr ago', unread: true },
  { id: 4, title: 'Case CR-2108 moved to In Court', time: 'Yesterday', unread: false },
]

export const REPORTS = [
  { id: 1, title: 'Case Summary Report', description: 'Summary of all cases' },
  { id: 2, title: 'Document Activity Report', description: 'Document uploads, views & downloads' },
  { id: 3, title: 'Evidence Report', description: 'List of evidence by case' },
  { id: 4, title: 'User Activity Report', description: 'User action and log summary' },
  { id: 5, title: 'Audit Trail Report', description: 'Complete audit log report' },
  { id: 6, title: 'System Usage Report', description: 'System performance and usage' },
]

export const LEGAL_TEMPLATES = [
  { id: 1, title: 'Bail Application Template' },
  { id: 2, title: 'Charge Sheet Template' },
  { id: 3, title: 'Witness Summons Template' },
]

export const PRE_DRAFTED_CLAUSES = [
  { id: 1, title: 'Pre-drafted Clause — Confidentiality' },
  { id: 2, title: 'Pre-drafted Clause — Chain of Custody' },
  { id: 3, title: 'Pre-drafted Clause — Non-Disclosure' },
]

export const DOC_TYPE_BREAKDOWN = [
  { name: 'FIR', value: 27 },
  { name: 'Charge Sheet', value: 20 },
  { name: 'Evidence', value: 19 },
  { name: 'Statements', value: 14 },
  { name: 'Court Orders', value: 20 },
]

export const UPLOAD_TREND = [
  { day: '1 May', count: 420 },
  { day: '8 May', count: 780 },
  { day: '15 May', count: 640 },
  { day: '22 May', count: 1120 },
  { day: '29 May', count: 980 },
]

export const RECENT_ACTIVITIES = [
  { id: 1, text: "New user 'Inspector Ramesh' created", time: '10 min ago' },
  { id: 2, text: "Document 'FIR_2024_0456.pdf' uploaded", time: '32 min ago' },
  { id: 3, text: "Role 'Legal Officer' updated", time: '1 hr ago' },
  { id: 4, text: 'Backup completed successfully', time: '2 hr ago' },
]

export const SECURITY_ALERTS_SHORT = [
  { id: 1, text: "Failed login attempt for user 'unknown_45'", time: '10:22 AM' },
  { id: 2, text: "Unusual access pattern detected for 'constable_45'", time: '09:56 AM' },
  { id: 3, text: 'Document integrity verification triggered', time: '09:40 AM' },
]

export const SYSTEM_HEALTH = [
  { id: 1, name: 'Database', detail: 'Response time: 120 ms', status: 'Healthy' },
  { id: 2, name: 'File Storage', detail: 'Storage used: 256.8 GB / 1 TB', status: 'Healthy' },
  { id: 3, name: 'Backup Service', detail: 'Last backup: 24 May 2025, 02:00 AM', status: 'Healthy' },
  { id: 4, name: 'Email Service', detail: 'All systems operational', status: 'Healthy' },
  { id: 5, name: 'AI/OCR Service', detail: 'Response time: 220 ms', status: 'Healthy' },
  { id: 6, name: 'Audit Service', detail: 'Logging events normally', status: 'Healthy' },
]

export const STORAGE_TREND = [
  { day: '18 May', usage: 62 },
  { day: '19 May', usage: 68 },
  { day: '20 May', usage: 71 },
  { day: '21 May', usage: 74 },
  { day: '22 May', usage: 78 },
  { day: '23 May', usage: 82 },
  { day: '24 May', usage: 88 },
]

export const SEARCH_RESULTS = [
  {
    id: 1,
    title: 'FSL Report — Blood Analysis',
    caseId: 'CR-2291',
    snippet:
      'Blood sample collected from the crime scene was analyzed using serological tests and DNA profiling...',
    date: '12 May 2025',
    relevance: 98,
  },
  {
    id: 2,
    title: 'Forensic Summary Report',
    caseId: 'CR-2291',
    snippet:
      'Summary of forensic findings including blood samples, fingerprint analysis and DNA match...',
    date: '14 May 2025',
    relevance: 85,
  },
  {
    id: 3,
    title: 'Lab Observation — Blood Sample',
    caseId: 'CR-2291',
    snippet: 'Microscopic examination of human DNA profile shows presence of a match to the suspect...',
    date: '11 May 2025',
    relevance: 78,
  },
]
