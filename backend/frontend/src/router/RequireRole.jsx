import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Unauthorized, Spinner } from '../components/common/States'

export default function RequireRole({ roles }) {
  const { user, isAuthenticated, initializing } = useAuth()
  const location = useLocation()

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Spinner label="Loading session…" full />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  if (roles && user.role !== 'admin' && user.role !== 'ADMIN' && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="card max-w-md w-full">
          <Unauthorized />
        </div>
      </div>
    )
  }

  return <Outlet />
}
