import { useEffect, useState } from 'react'
import { Bell, Menu, LogOut, User, ChevronDown, Radio } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useUI } from '../../context/UIContext'
import { ROLE_LABELS } from '../../utils/constants'
import { fetchAuditLogs } from '../../api/realApi'
import { subscribeToGlobalAudit } from '../../api/websocketService'

export default function Topbar({ title, profilePath }) {
  const { user, logout } = useAuth()
  const { setSidebarOpen } = useUI()
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    fetchAuditLogs().then((res) => {
      const logs = Array.isArray(res) ? res : res?.results || []
      const initial = logs.slice(0, 8).map((log) => ({
        id: log.log_id,
        title: log.details || `${log.action} - ${log.case_number || log.document_title || 'Record'}`,
        time: log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Recent',
        unread: false,
      }))
      setNotifications(initial)
    }).catch(() => {})

    const unsub = subscribeToGlobalAudit((newLog) => {
      const liveAlert = {
        id: newLog.log_id || Date.now(),
        title: newLog.details || `Live: ${newLog.action} on ${newLog.case_number || newLog.document_title || 'Record'}`,
        time: 'Just now',
        unread: true,
      }
      setNotifications((prev) => [liveAlert, ...prev.filter((n) => n.id !== liveAlert.id).slice(0, 19)])
    })

    return () => unsub()
  }, [])

  const unread = notifications.filter((n) => n.unread).length

  const handleOpenNotif = () => {
    setNotifOpen((o) => {
      if (!o) {
        // Mark all as read when opening
        setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
      }
      return !o
    })
    setProfileOpen(false)
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between px-4 lg:px-6 h-16">
        <div className="flex items-center gap-3 min-w-0">
          <button className="lg:hidden text-navy-700" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <h2 className="font-bold text-navy-900 text-base lg:text-lg truncate">{title}</h2>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          <div className="relative">
            <button
              onClick={handleOpenNotif}
              className="relative rounded-lg p-2 hover:bg-slate-100 text-slate-500"
            >
              <Bell size={20} />
              {unread > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm text-navy-900">Live Audit Alerts</p>
                    <Radio size={12} className="text-emerald-500 animate-pulse" />
                  </div>
                  <span className="text-xs text-navy-600 font-semibold">{unread} new</span>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">No alerts yet</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start gap-2">
                          {n.unread && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-600 shrink-0" />}
                          <div className={n.unread ? '' : 'ml-3'}>
                            <p className="text-xs font-medium text-navy-800 leading-snug">{n.title}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen((o) => !o)
                setNotifOpen(false)
              }}
              className="flex items-center gap-2 rounded-lg pl-1.5 pr-2 py-1 hover:bg-slate-100"
            >
              <div className="h-8 w-8 rounded-full bg-navy-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {user?.avatarInitials || <User size={16} />}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-navy-900 leading-tight">{user?.name}</p>
                <p className="text-[10px] text-slate-400">{ROLE_LABELS[user?.role]}</p>
              </div>
              <ChevronDown size={14} className="text-slate-400 hidden md:block" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
                <Link
                  to={profilePath || '/profile'}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-navy-700 hover:bg-slate-50"
                >
                  <User size={15} /> My Profile
                </Link>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={15} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
