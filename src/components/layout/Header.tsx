import { useAuthStore } from '../../store/auth'
import { LogOut, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Header() {
  const { username, accountId, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-14 bg-bg-secondary border-b border-border flex items-center justify-between px-6">
      <div className="text-sm text-muted">
        Bangladesh DSE/CSE Order Management System
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <User size={14} className="text-muted" />
          <span className="text-white font-medium">{username}</span>
          {accountId && <span className="text-muted">· {accountId}</span>}
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1 text-muted hover:text-bear transition-colors text-sm">
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </header>
  )
}
