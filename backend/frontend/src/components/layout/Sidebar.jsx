import { NavLink } from 'react-router-dom'
import { Scale, X, LogOut } from 'lucide-react'
import { ROLE_THEME } from '../../utils/constants'
import { useUI } from '../../context/UIContext'
import { useAuth } from '../../context/AuthContext'

export default function Sidebar({ role, navItems, brandLabel = 'SecureDocs' }) {
  const theme = ROLE_THEME[role]
  const { sidebarOpen, setSidebarOpen } = useUI()
  const { logout } = useAuth()

  const content = (
    <div className={`h-full flex flex-col ${theme.sidebarBg} text-white w-64 shrink-0`}>
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className={`rounded-lg p-1.5 ${theme.accentBg}`}>
            <Scale size={18} className={theme.accentText} />
          </div>
          <div>
            <p className="font-bold leading-tight">{brandLabel}</p>
            <p className="text-[10px] text-white/50 uppercase tracking-wide">{theme.portalName}</p>
          </div>
        </div>
        <button className="lg:hidden text-white/60" onClick={() => setSidebarOpen(false)}>
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? `${theme.sidebarActive} text-white` : `text-white/70 ${theme.sidebarHover}`
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-white/10 space-y-2">
        <button
          onClick={() => {
            setSidebarOpen(false)
            logout()
          }}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-300 hover:bg-white/10 transition-colors"
        >
          <LogOut size={17} />
          <span>Log Out</span>
        </button>
        <div className="px-2">
          <p className="text-white/40 text-[10px]">Government of India</p>
          <p className="text-white/30 text-[10px]">Restricted Access · Ministry of Home Affairs</p>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:block h-screen sticky top-0">{content}</aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full animate-fade-in">{content}</div>
        </div>
      )}
    </>
  )
}
