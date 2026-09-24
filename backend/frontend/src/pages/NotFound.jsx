import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-4">
      <div className="text-center">
        <ShieldAlert className="text-gold-400 mx-auto mb-4" size={48} />
        <h1 className="text-2xl font-bold text-white">404 — Page Not Found</h1>
        <p className="text-white/50 text-sm mt-2">The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn-gold inline-flex mt-6">
          Return to Portal Selection
        </Link>
      </div>
    </div>
  )
}
