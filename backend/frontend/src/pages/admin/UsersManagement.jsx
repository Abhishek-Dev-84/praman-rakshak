import { useEffect, useMemo, useState } from 'react'
import { Plus, Ban, Trash2, Pencil, Shield, UserCheck, Loader2 } from 'lucide-react'
import { PageHeader, SearchInput, Tabs } from '../../components/common/Controls'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import { useUI } from '../../context/UIContext'
import { fetchUsers, createUser, updateUser, deleteUser } from '../../api/realApi'

export default function UsersManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [deleteTargetUser, setDeleteTargetUser] = useState(null)
  const [confirmUser, setConfirmUser] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const { pushToast } = useUI()

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await fetchUsers()
      setUsers(Array.isArray(data) ? data : data?.results || [])
    } catch (err) {
      console.error(err)
      pushToast({ type: 'error', title: 'Failed to load users', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const filtered = useMemo(() => {
    let list = users
    if (tab === 'active') list = list.filter((u) => u.is_active)
    if (tab === 'inactive' || tab === 'blocked') list = list.filter((u) => !u.is_active)
    if (query) {
      const q = query.toLowerCase()
      list = list.filter((u) => u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
    }
    return list
  }, [users, tab, query])

  const toggleStatus = async (user) => {
    try {
      await updateUser(user.id, { is_active: !user.is_active })
      pushToast({
        type: 'success',
        title: `User ${user.is_active ? 'deactivated' : 'activated'}`,
        message: user.username,
      })
      setConfirmUser(null)
      loadUsers()
    } catch (err) {
      pushToast({ type: 'error', title: 'Action failed', message: err.message })
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return
    setSubmitting(true)
    try {
      await deleteUser(deleteTargetUser.id)
      pushToast({
        type: 'success',
        title: 'User account removed',
        message: `${deleteTargetUser.username} deactivated from system.`,
      })
      setDeleteTargetUser(null)
      loadUsers()
    } catch (err) {
      pushToast({ type: 'error', title: 'Deletion failed', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const form = new FormData(e.target)
    try {
      const payload = {
        username: form.get('username'),
        email: form.get('email'),
        role: form.get('role'),
        password: form.get('password'),
        first_name: form.get('name')?.split(' ')[0] || '',
        last_name: form.get('name')?.split(' ').slice(1).join(' ') || '',
      }
      await createUser(payload)
      pushToast({ type: 'success', title: 'User created successfully', message: payload.username })
      setCreateOpen(false)
      loadUsers()
    } catch (err) {
      pushToast({ type: 'error', title: 'Failed to create user', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!editUser) return
    setSubmitting(true)
    const form = new FormData(e.target)
    try {
      const payload = {
        email: form.get('email'),
        role: form.get('role'),
      }
      const newPass = form.get('password')
      if (newPass && newPass.trim().length > 0) {
        payload.password = newPass.trim()
      }
      await updateUser(editUser.id, payload)
      pushToast({ type: 'success', title: 'User account updated', message: editUser.username })
      setEditUser(null)
      loadUsers()
    } catch (err) {
      pushToast({ type: 'error', title: 'Failed to update user', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Users & Role Management"
        subtitle={`Showing ${filtered.length} of ${users.length} authoritative system accounts`}
        actions={
          <button onClick={() => setCreateOpen(true)} className="btn-primary btn-sm">
            <Plus size={16} /> Add New Officer / Official
          </button>
        }
      />

      <div className="card p-4 mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <Tabs
          tabs={[
            { value: 'all', label: 'All Users', count: users.length },
            { value: 'active', label: 'Active', count: users.filter((u) => u.is_active).length },
            { value: 'inactive', label: 'Inactive / Suspended', count: users.filter((u) => !u.is_active).length },
          ]}
          active={tab}
          onChange={setTab}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Search users…" className="md:w-72" />
      </div>

      <div className="card p-4">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading user accounts from DRF backend...</div>
        ) : (
          <DataTable
            columns={[
              {
                key: 'user',
                header: 'Official / Account',
                render: (row) => (
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center text-xs font-bold shrink-0 uppercase">
                      {row.username.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{row.username}</p>
                      <p className="text-xs text-slate-400 truncate">{row.email || 'No email registered'}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: 'role',
                header: 'Assigned Role',
                render: (row) => (
                  <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {row.role}
                  </span>
                ),
              },
              {
                key: 'public_key',
                header: 'RSA Key Status',
                render: (row) => (
                  <span className="text-xs text-slate-500">
                    {row.public_key ? '✓ Enrolled' : 'Pending'}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => <Badge status={row.is_active ? 'Active' : 'Inactive'} />,
              },
            ]}
            data={filtered}
            actions={(row) => (
              <div className="flex items-center justify-end gap-1.5">
                <button
                  onClick={() => setEditUser(row)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-700 transition-colors"
                  title="Edit User Role / Email"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => setConfirmUser(row)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-600 transition-colors"
                  title={row.is_active ? 'Deactivate User' : 'Activate User'}
                >
                  <Ban size={15} />
                </button>
                <button
                  onClick={() => setDeleteTargetUser(row)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors"
                  title="Delete User"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          />
        )}
      </div>

      {/* Create User Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create System Official Account">
        <form onSubmit={handleCreate} className="space-y-3.5">
          <div>
            <label className="label">Username</label>
            <input name="username" required className="input" placeholder="e.g. officer_kumar" />
          </div>
          <div>
            <label className="label">Full Name</label>
            <input name="name" required className="input" placeholder="e.g. Inspector R. Kumar" />
          </div>
          <div>
            <label className="label">Official Email</label>
            <input name="email" type="email" required className="input" placeholder="kumar@mha.gov.in" />
          </div>
          <div>
            <label className="label">System Role</label>
            <select name="role" required className="input">
              <option value="OFFICER">Police Officer</option>
              <option value="INVESTIGATOR">Forensic Investigator</option>
              <option value="LEGAL_OFFICER">Legal Officer</option>
              <option value="JUDGE">Judicial Bench (Judge)</option>
              <option value="ADMIN">System Administrator</option>
            </select>
          </div>
          <div>
            <label className="label">Initial Password</label>
            <input name="password" type="password" required className="input" placeholder="Enter secure password" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-outline btn-sm">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary btn-sm">
              {submitting ? <Loader2 className="animate-spin" size={14} /> : null}
              {submitting ? 'Creating…' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`Edit Account: ${editUser?.username}`}>
        {editUser && (
          <form onSubmit={handleUpdate} className="space-y-3.5">
            <div>
              <label className="label">Official Email</label>
              <input name="email" type="email" defaultValue={editUser.email} required className="input" />
            </div>
            <div>
              <label className="label">Assigned Role</label>
              <select name="role" defaultValue={editUser.role} required className="input">
                <option value="OFFICER">Police Officer</option>
                <option value="INVESTIGATOR">Forensic Investigator</option>
                <option value="LEGAL_OFFICER">Legal Officer</option>
                <option value="JUDGE">Judicial Bench (Judge)</option>
                <option value="ADMIN">System Administrator</option>
              </select>
            </div>
            <div>
              <label className="label">Reset Password (leave blank to keep current)</label>
              <input name="password" type="password" className="input" placeholder="Enter new password (optional)" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditUser(null)} className="btn-outline btn-sm">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary btn-sm">
                {submitting ? <Loader2 className="animate-spin" size={14} /> : null}
                {submitting ? 'Updating…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirm Deactivation Modal */}
      <Modal
        open={!!confirmUser}
        onClose={() => setConfirmUser(null)}
        title={confirmUser?.is_active ? 'Deactivate User Account' : 'Activate User Account'}
        footer={
          <>
            <button onClick={() => setConfirmUser(null)} className="btn-outline btn-sm">
              Cancel
            </button>
            <button onClick={() => toggleStatus(confirmUser)} className="btn-danger btn-sm">
              <Ban size={14} /> Confirm
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to {confirmUser?.is_active ? 'deactivate' : 'activate'}{' '}
          <span className="font-semibold text-slate-900">{confirmUser?.username}</span>?
        </p>
      </Modal>

      {/* Delete User Modal */}
      <Modal
        open={!!deleteTargetUser}
        onClose={() => setDeleteTargetUser(null)}
        title="Delete User Account"
        footer={
          <>
            <button onClick={() => setDeleteTargetUser(null)} className="btn-outline btn-sm">
              Cancel
            </button>
            <button onClick={handleDeleteUser} disabled={submitting} className="btn-danger btn-sm">
              {submitting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
              {submitting ? 'Deleting…' : 'Permanently Delete'}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to permanently remove user account{' '}
          <span className="font-semibold text-slate-900">{deleteTargetUser?.username}</span>?
        </p>
      </Modal>
    </div>
  )
}
