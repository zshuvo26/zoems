import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { ordersApi, portfolioApi, marketApi } from '../api'
import { StatCard } from '../components/common/Card'
import { FullPageSpinner } from '../components/common/Spinner'
import StatusBadge from '../components/common/StatusBadge'
import { fmt, changeClass } from '../utils/formatters'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function DashboardPage() {
  const { accountId } = useAuthStore()
  const nav = useNavigate()

  const { data: portfolio, isLoading: pLoad } = useQuery({
    queryKey: ['portfolio', accountId],
    queryFn: () => portfolioApi.summary(accountId!),
    enabled: !!accountId,
    refetchInterval: 30_000,
  })

  const { data: orders = [], isLoading: oLoad } = useQuery({
    queryKey: ['orders', accountId],
    queryFn: () => ordersApi.list(accountId!),
    enabled: !!accountId,
    refetchInterval: 10_000,
  })

  const { data: movers = [] } = useQuery({
    queryKey: ['movers', 'DSE'],
    queryFn: () => marketApi.movers('DSE'),
    refetchInterval: 60_000,
  })

  if (pLoad || oLoad) return <FullPageSpinner />

  const activeOrders = orders.filter(o => ['PENDING','OPEN','PARTIAL'].includes(o.status))
  const todayFilled = orders.filter(o => o.status === 'FILLED' && o.filledAt?.startsWith(new Date().toISOString().slice(0,10)))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-muted text-sm">Account: {accountId}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Portfolio Value" value={fmt.compact(portfolio?.totalValue)} color="text-white" />
        <StatCard label="Cash Balance" value={fmt.compact(portfolio?.cashBalance)} color="text-white" />
        <StatCard
          label="Unrealized P&L"
          value={fmt.compact(portfolio?.unrealizedPnl)}
          color={changeClass(portfolio?.unrealizedPnl)}
        />
        <StatCard
          label="Today's P&L"
          value={fmt.compact(portfolio?.todayPnl)}
          sub={fmt.pct(portfolio?.dayChangePercent)}
          color={changeClass(portfolio?.todayPnl)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Active Orders" value={String(activeOrders.length)} color="text-accent-blue" />
        <StatCard label="Filled Today" value={String(todayFilled.length)} color="text-bull" />
        <StatCard label="Positions" value={String(portfolio?.positions?.length ?? 0)} color="text-white" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Orders */}
        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-white">Active Orders</h3>
            <button className="text-accent-blue text-sm hover:underline" onClick={() => nav('/orders')}>View All</button>
          </div>
          {activeOrders.length === 0 ? (
            <p className="text-muted text-sm">No active orders</p>
          ) : (
            <div className="space-y-2">
              {activeOrders.slice(0, 5).map(o => (
                <div
                  key={o.id}
                  className="flex items-center justify-between p-2 bg-bg-secondary rounded-lg cursor-pointer hover:bg-bg-hover"
                  onClick={() => nav(`/orders/${o.id}`)}
                >
                  <div>
                    <span className={`text-xs font-bold mr-2 ${o.side === 'BUY' ? 'text-bull' : 'text-bear'}`}>{o.side}</span>
                    <span className="text-white text-sm font-medium">{o.symbol}</span>
                    <span className="text-muted text-xs ml-2">{o.exchange}</span>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={o.status} />
                    <p className="text-muted text-xs mt-0.5">{fmt.qty(o.quantity)} @ {fmt.price(o.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Movers */}
        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-white">Top Movers (DSE)</h3>
            <button className="text-accent-blue text-sm hover:underline" onClick={() => nav('/market')}>Market</button>
          </div>
          <div className="space-y-2">
            {(movers as any[]).slice(0, 6).map((m: any) => (
              <div
                key={m.symbol}
                className="flex items-center justify-between p-2 bg-bg-secondary rounded-lg cursor-pointer hover:bg-bg-hover"
                onClick={() => nav(`/market/DSE/${m.symbol}`)}
              >
                <div>
                  <span className="text-white text-sm font-medium">{m.symbol}</span>
                  <span className="text-muted text-xs ml-2">{m.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm">{fmt.price(m.lastPrice)}</p>
                  <p className={`text-xs font-medium ${changeClass(m.changePercent)}`}>{fmt.pct(m.changePercent)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Positions */}
      {portfolio?.positions && portfolio.positions.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-white mb-3">Holdings</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Symbol','Exchange','Qty','Avg Cost','Last Price','Mkt Value','Unrealized P&L','%'].map(h => (
                    <th key={h} className="text-left text-muted font-medium py-2 px-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {portfolio.positions.map(pos => (
                  <tr key={pos.symbol} className="border-b border-border/50 hover:bg-bg-hover">
                    <td className="py-2 px-2 text-white font-medium">{pos.symbol}</td>
                    <td className="py-2 px-2 text-muted">{pos.exchange}</td>
                    <td className="py-2 px-2">{fmt.qty(pos.quantity)}</td>
                    <td className="py-2 px-2">{fmt.price(pos.avgCost)}</td>
                    <td className="py-2 px-2">{fmt.price(pos.lastPrice)}</td>
                    <td className="py-2 px-2">{fmt.compact(pos.marketValue)}</td>
                    <td className={`py-2 px-2 font-medium ${changeClass(pos.unrealizedPnl)}`}>{fmt.compact(pos.unrealizedPnl)}</td>
                    <td className={`py-2 px-2 ${changeClass(pos.unrealizedPnlPct)}`}>{fmt.pct(pos.unrealizedPnlPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
