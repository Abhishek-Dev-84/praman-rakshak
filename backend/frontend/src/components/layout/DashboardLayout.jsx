import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomNav from './BottomNav'

export default function DashboardLayout({ role, navItems, bottomNavItems, brandLabel }) {
  const location = useLocation()
  const current = [...navItems].reverse().find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  )

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar role={role} navItems={navItems} brandLabel={brandLabel} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar title={current?.label || 'Dashboard'} profilePath={navItems.find((n) => n.label === 'Profile')?.to} />
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">
          <Outlet />
        </main>
        <BottomNav items={bottomNavItems || navItems.slice(0, 5)} />
      </div>
    </div>
  )
}
