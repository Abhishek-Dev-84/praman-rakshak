import { useState } from 'react'
import { PageHeader } from '../../components/common/Controls'
import { useUI } from '../../context/UIContext'
import { Save } from 'lucide-react'

const ROLES_LIST = ['Admin', 'Judge', 'Investigator', 'Legal Officer', 'Police Officer']
const PERMISSIONS = [
  'Upload Documents',
  'Approve / Sign Documents',
  'Delete Documents',
  'View Live Dashboard',
  'Search & View All Cases',
  'Manage Users',
  'View Audit Trail',
]

const DEFAULT_MATRIX = {
  Admin: [true, false, true, true, true, true, true],
  Judge: [false, true, false, false, true, false, true],
  Investigator: [true, true, false, false, true, false, true],
  'Legal Officer': [false, false, false, false, true, false, true],
  'Police Officer': [true, false, false, false, false, false, true],
}

export default function RolesPermissions() {
  const [matrix, setMatrix] = useState(DEFAULT_MATRIX)
  const { pushToast } = useUI()

  const toggle = (role, idx) => {
    setMatrix((prev) => ({
      ...prev,
      [role]: prev[role].map((v, i) => (i === idx ? !v : v)),
    }))
  }

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        subtitle="Configure access levels for each role in the system"
        actions={
          <button
            onClick={() => pushToast({ type: 'success', title: 'Permissions saved' })}
            className="btn-primary btn-sm"
          >
            <Save size={16} /> Save Changes
          </button>
        }
      />
      <div className="card p-4 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Permission</th>
              {ROLES_LIST.map((role) => (
                <th key={role} className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((perm, idx) => (
              <tr key={perm} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-3 font-medium text-navy-800">{perm}</td>
                {ROLES_LIST.map((role) => (
                  <td key={role} className="text-center px-3 py-3">
                    <input
                      type="checkbox"
                      checked={matrix[role][idx]}
                      onChange={() => toggle(role, idx)}
                      className="h-4 w-4 rounded accent-navy-700 cursor-pointer"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
