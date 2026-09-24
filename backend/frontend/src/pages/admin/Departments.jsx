import { useEffect, useState } from 'react'
import { Plus, Building2, Users } from 'lucide-react'
import { PageHeader } from '../../components/common/Controls'
import Modal from '../../components/common/Modal'
import { useUI } from '../../context/UIContext'
import { fetchUsers, fetchCases } from '../../api/realApi'

export default function Departments() {
  const [depts, setDepts] = useState([])
  const [open, setOpen] = useState(false)
  const { pushToast } = useUI()

  useEffect(() => {
    async function loadDepts() {
      try {
        const [uRes, cRes] = await Promise.all([
          fetchUsers().catch(() => []),
          fetchCases().catch(() => []),
        ])
        const users = Array.isArray(uRes) ? uRes : uRes?.results || []
        const cases = Array.isArray(cRes) ? cRes : cRes?.results || []

        const policeUsers = users.filter((u) => u.role === 'OFFICER').length
        const courtUsers = users.filter((u) => u.role === 'JUDGE').length
        const legalUsers = users.filter((u) => u.role === 'LEGAL_OFFICER').length
        const investigatorUsers = users.filter((u) => u.role === 'INVESTIGATOR').length
        const adminUsers = users.filter((u) => u.role === 'ADMIN').length

        const baseDepts = [
          { id: 1, name: 'Delhi Police / State Police', type: 'Law Enforcement', users: policeUsers, cases: cases.filter((c) => c.status !== 'CLOSED').length },
          { id: 2, name: 'Sessions Court / Judiciary', type: 'Judiciary', users: courtUsers, cases: cases.length },
          { id: 3, name: 'Legal Department, MHA', type: 'Legal', users: legalUsers, cases: cases.length },
          { id: 4, name: 'Forensic Science Laboratory / CID', type: 'Forensics', users: investigatorUsers, cases: cases.length },
          { id: 5, name: 'Ministry of Home Affairs HQ', type: 'Administration', users: adminUsers, cases: cases.length },
        ]
        setDepts(baseDepts)
      } catch (err) {
        console.error('Failed to load departments', err)
      }
    }
    loadDepts()
  }, [])

  const handleCreate = (e) => {
    e.preventDefault()
    const form = new FormData(e.target)
    setDepts((prev) => [
      { id: prev.length + 1, name: form.get('name'), type: form.get('type'), users: 0, cases: 0 },
      ...prev,
    ])
    setOpen(false)
    pushToast({ type: 'success', title: 'Department added' })
  }

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Organizations connected to the platform"
        actions={
          <button onClick={() => setOpen(true)} className="btn-primary btn-sm">
            <Plus size={16} /> Add Department
          </button>
        }
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {depts.map((d) => (
          <div key={d.id} className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-lg bg-navy-50 p-2.5 text-navy-700">
                <Building2 size={20} />
              </div>
              <div>
                <p className="font-semibold text-navy-900 text-sm">{d.name}</p>
                <p className="text-xs text-slate-400">{d.type}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <div>
                <p className="text-lg font-bold text-navy-900">{d.users}</p>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Users size={11} /> Users
                </p>
              </div>
              <div>
                <p className="text-lg font-bold text-navy-900">{d.cases}</p>
                <p className="text-xs text-slate-400">Cases</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Department">
        <form onSubmit={handleCreate} className="space-y-3.5">
          <div>
            <label className="label">Department Name</label>
            <input name="name" required className="input" placeholder="e.g. Rohini Court, Delhi" />
          </div>
          <div>
            <label className="label">Type</label>
            <select name="type" className="input">
              <option>Law Enforcement</option>
              <option>Judiciary</option>
              <option>Legal</option>
              <option>Forensics</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-outline btn-sm">
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-sm">
              Add
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
