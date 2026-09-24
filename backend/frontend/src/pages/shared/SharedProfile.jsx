import { Copy, Shield, Bell, LogOut, HelpCircle, FileText } from 'lucide-react'
import { PageHeader } from '../../components/common/Controls'
import { useAuth } from '../../context/AuthContext'
import { useUI } from '../../context/UIContext'
import { ROLE_LABELS } from '../../utils/constants'
import { useState, useEffect } from 'react'
import { fetchCases, fetchDocuments } from '../../api/realApi'

export default function SharedProfile({ stats = [] }) {
  const { user, logout } = useAuth()
  const { pushToast } = useUI()
  const [biometric, setBiometric] = useState(true)
  const [dynamicStats, setDynamicStats] = useState(stats)

  useEffect(() => {
    if (stats && stats.length > 0) {
      setDynamicStats(stats)
      return
    }
    async function loadStats() {
      try {
        const [cList, dList] = await Promise.all([
          fetchCases().catch(() => []),
          fetchDocuments().catch(() => []),
        ])
        const casesCount = Array.isArray(cList) ? cList.length : cList?.results?.length || 0
        const docsCount = Array.isArray(dList) ? dList.length : dList?.results?.length || 0
        setDynamicStats([
          { label: 'Assigned Cases', value: String(casesCount) },
          { label: 'Documents Ingested', value: String(docsCount) },
          { label: 'Cryptographic Chain', value: 'Active' },
        ])
      } catch (_) {
        setDynamicStats([
          { label: 'Assigned Cases', value: '0' },
          { label: 'Documents Ingested', value: '0' },
          { label: 'Cryptographic Chain', value: 'Active' },
        ])
      }
    }
    loadStats()
  }, [stats])

  return (
    <div>
      <PageHeader title="My Profile" />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-6 text-center lg:col-span-1">
          <div className="h-20 w-20 rounded-full bg-navy-700 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-3">
            {user?.avatarInitials || (user?.name || user?.username || 'U').slice(0, 2).toUpperCase()}
          </div>
          <p className="font-bold text-navy-900">{user?.name || user?.username || 'Official User'}</p>
          <p className="text-sm text-slate-400">{user?.designation || ROLE_LABELS[user?.role] || 'Authorized Official'}</p>
          <span className="badge bg-gold-100 text-gold-800 mt-2 inline-flex">{ROLE_LABELS[user?.role] || user?.role}</span>

          <div className="grid grid-cols-2 gap-2 mt-5 pt-5 border-t border-slate-100 text-left">
            <div>
              <p className="text-xs text-slate-400">User ID / Handle</p>
              <p className="text-sm font-semibold text-navy-800 truncate" title={user?.username || user?.id}>{user?.username || user?.id}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Official Email</p>
              <p className="text-sm font-semibold text-navy-800 truncate" title={user?.email}>{user?.email || 'official@mha.gov.in'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-400">Department</p>
              <p className="text-sm font-semibold text-navy-800">{user?.department || 'Department of Legal Affairs & Law Enforcement'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-400">Account Status</p>
              <p className="text-sm font-semibold text-emerald-600">Active · Cryptographically Keyed</p>
            </div>
          </div>

          <button onClick={logout} className="btn-danger w-full mt-6">
            <LogOut size={16} /> Log Out
          </button>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {dynamicStats.length > 0 && (
            <div className="card p-5">
              <p className="font-semibold text-navy-900 text-sm mb-4">Activity Summary</p>
              <div className={`grid grid-cols-${Math.min(dynamicStats.length, 4)} gap-3 text-center`}>
                {dynamicStats.map((s) => (
                  <div key={s.label}>
                    <p className="text-2xl font-bold text-navy-900">{s.value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-5">
            <p className="font-semibold text-navy-900 text-sm mb-4 flex items-center gap-1.5">
              <Shield size={15} /> Digital Signature
            </p>
            <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Digital Key Fingerprint</p>
                <p className="text-sm font-mono text-navy-800 truncate">AB12 CD34 EF56 GH78 IJ90 KL12</p>
              </div>
              <button
                onClick={() => pushToast({ type: 'success', title: 'Copied to clipboard' })}
                className="btn-outline btn-sm shrink-0 ml-2"
              >
                <Copy size={13} /> Copy
              </button>
            </div>
          </div>

          <div className="card p-5">
            <p className="font-semibold text-navy-900 text-sm mb-4">Security</p>
            <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-slate-400" />
                <span className="text-sm text-navy-700">Biometric Login</span>
              </div>
              <button
                onClick={() => setBiometric((b) => !b)}
                className={`h-6 w-11 rounded-full transition-colors relative ${biometric ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    biometric ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-slate-100 text-sm">
              <span className="text-navy-700">Last Login</span>
              <span className="text-slate-400">Today, 09:10 AM</span>
            </div>
            <div className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-navy-700">Active Sessions</span>
              <span className="text-slate-400">2 devices</span>
            </div>
          </div>

          <div className="card p-2">
            <button className="w-full flex items-center justify-between px-3 py-3 hover:bg-slate-50 rounded-lg text-sm text-navy-700">
              <span className="flex items-center gap-2"><FileText size={15} className="text-slate-400" /> Terms &amp; Compliance</span>
              <span className="text-slate-300">›</span>
            </button>
            <button className="w-full flex items-center justify-between px-3 py-3 hover:bg-slate-50 rounded-lg text-sm text-navy-700">
              <span className="flex items-center gap-2"><HelpCircle size={15} className="text-slate-400" /> Help &amp; Support</span>
              <span className="text-slate-300">›</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
