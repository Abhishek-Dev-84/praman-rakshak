import { useState } from 'react'
import { Settings, Clock, Globe, Bell, Lock, ShieldCheck, Users2, FileText, GitBranch, Link2, Plug, Save } from 'lucide-react'
import { PageHeader, Tabs } from '../../components/common/Controls'
import { useUI } from '../../context/UIContext'

const SECTIONS = {
  general: [
    { icon: Settings, label: 'General Settings' },
    { icon: Clock, label: 'Date & Time' },
    { icon: Globe, label: 'Regional Settings' },
    { icon: Bell, label: 'Notifications' },
  ],
  security: [
    { icon: Lock, label: 'Password Policy' },
    { icon: ShieldCheck, label: 'Two-Factor Authentication', toggle: true },
    { icon: Users2, label: 'Session Management' },
    { icon: Link2, label: 'IP Allowlist' },
  ],
  documents: [
    { icon: FileText, label: 'Document Types' },
    { icon: GitBranch, label: 'Version Control Settings' },
  ],
  integrations: [
    { icon: Plug, label: 'API Configuration' },
    { icon: Link2, label: 'Third Party Integrations' },
  ],
}

export default function AdminSettings() {
  const [tab, setTab] = useState('general')
  const [twoFA, setTwoFA] = useState(true)
  const { pushToast } = useUI()

  return (
    <div>
      <PageHeader
        title="System Settings"
        actions={
          <button onClick={() => pushToast({ type: 'success', title: 'Settings saved' })} className="btn-primary btn-sm">
            <Save size={16} /> Save Changes
          </button>
        }
      />

      <div className="card p-4 mb-4">
        <Tabs
          tabs={[
            { value: 'general', label: 'General' },
            { value: 'security', label: 'Security' },
            { value: 'documents', label: 'Documents' },
            { value: 'integrations', label: 'Integrations' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      <div className="card p-2">
        {SECTIONS[tab].map((item, i) => (
          <div
            key={item.label}
            className={`flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 rounded-lg ${
              i !== SECTIONS[tab].length - 1 ? 'border-b border-slate-100' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon size={17} className="text-slate-400" />
              <span className="text-sm font-medium text-navy-800">{item.label}</span>
            </div>
            {item.toggle ? (
              <button
                onClick={() => setTwoFA((v) => !v)}
                className={`h-6 w-11 rounded-full transition-colors relative ${twoFA ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    twoFA ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            ) : (
              <span className="text-slate-300">›</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
