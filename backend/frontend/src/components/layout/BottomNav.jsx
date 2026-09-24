import { NavLink } from 'react-router-dom'

export default function BottomNav({ items }) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 flex items-stretch">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold ${
              isActive ? 'text-navy-700' : 'text-slate-400'
            }`
          }
        >
          <item.icon size={19} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
