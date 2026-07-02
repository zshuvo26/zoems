import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, ShoppingCart, PieChart, Star,
  Bell, FileText, Gift, Wallet, BarChart3, Shield, Calendar,
  Settings, Activity, Calculator, Cpu, Layers, AlignJustify
} from 'lucide-react'

const LINKS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/market', icon: TrendingUp, label: 'Market' },
  { to: '/orders', icon: ShoppingCart, label: 'Orders' },
  { to: '/algo', icon: Cpu, label: 'Algo' },
  { to: '/basket', icon: Layers, label: 'Basket' },
  { to: '/parent-orders', icon: AlignJustify, label: 'Parent Orders' },
  { to: '/portfolio', icon: PieChart, label: 'Portfolio' },
  { to: '/watchlist', icon: Star, label: 'Watchlist' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/templates', icon: FileText, label: 'Templates' },
  { to: '/ipo', icon: Gift, label: 'IPO' },
  { to: '/ledger', icon: Wallet, label: 'Ledger' },
  { to: '/settlement', icon: BarChart3, label: 'Settlement' },
  { to: '/compliance', icon: Shield, label: 'Compliance' },
  { to: '/corporate-actions', icon: FileText, label: 'Corp Actions' },
  { to: '/margin', icon: Activity, label: 'Margin' },
  { to: '/holidays', icon: Calendar, label: 'Holidays' },
  { to: '/latency', icon: Activity, label: 'Latency' },
  { to: '/profit-calc', icon: Calculator, label: 'Profit Calc' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-bg-secondary border-r border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-accent-blue rounded-lg flex items-center justify-center text-white font-bold text-sm">Z</div>
          <span className="font-bold text-white text-base">ZOEMS</span>
        </div>
        <p className="text-muted text-xs mt-0.5">DSE/CSE Trading Platform</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {LINKS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-accent-blue/10 text-accent-blue border-r-2 border-accent-blue font-medium'
                  : 'text-muted hover:text-white hover:bg-bg-hover'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
