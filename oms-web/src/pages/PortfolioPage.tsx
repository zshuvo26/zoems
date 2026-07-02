import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { portfolioApi } from '../api'
import { fmt, changeClass } from '../utils/formatters'
import { FullPageSpinner } from '../components/common/Spinner'
import { StatCard } from '../components/common/Card'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis } from 'recharts'

const COLORS = ['#3D7FFF','#00D09C','#FFB547','#FF6B6B','#8B9CB6','#a78bfa']

export default function PortfolioPage() {
  const { accountId } = useAuthStore()
  const [tab, setTab] = useState<'holdings'|'performance'|'tca'>('holdings')
  const [period, setPeriod] = useState('1M')

  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['portfolio', accountId],
    queryFn: () => portfolioApi.summary(accountId!),
    enabled: !!accountId,
    refetchInterval: 30_000,
  })

  const { data: perf } = useQuery({
    queryKey: ['performance', accountId, period],
    queryFn: () => portfolioApi.performance(accountId!, period),
    enabled: !!accountId && tab === 'performance',
  })

  const { data: tca = [] } = useQuery({
    queryKey: ['tca', accountId],
    queryFn: () => portfolioApi.tca(accountId!, '', ''),
    enabled: !!accountId && tab === 'tca',
  })

  if (isLoading) return <FullPageSpinner />

  const pieData = portfolio?.positions?.map(p => ({
    name: p.symbol,
    value: p.marketValue,
  })) ?? []

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Portfolio</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Portfolio Value" value={fmt.compact(portfolio?.totalValue)} />
        <StatCard label="Cash" value={fmt.compact(portfolio?.cashBalance)} />
        <StatCard label="Unrealized P&L" value={fmt.compact(portfolio?.unrealizedPnl)} color={changeClass(portfolio?.unrealizedPnl)} />
        <StatCard label="Today's P&L" value={fmt.compact(portfolio?.todayPnl)} sub={fmt.pct(portfolio?.dayChangePercent)} color={changeClass(portfolio?.todayPnl)} />
      </div>

      <div className="flex gap-2 border-b border-border pb-2">
        {(['holdings','performance','tca'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium transition-colors capitalize ${tab === t ? 'text-accent-blue border-b-2 border-accent-blue' : 'text-muted hover:text-white'}`}>
            {t === 'tca' ? 'TCA Analysis' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'holdings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card p-0">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-white">Holdings</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Symbol','Exchange','Qty','Avg Cost','Last','Mkt Value','Unr. P&L','%'].map(h => (
                      <th key={h} className="text-left text-muted font-medium py-2.5 px-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {portfolio?.positions?.map(p => (
                    <tr key={p.symbol} className="border-b border-border/50 hover:bg-bg-hover">
                      <td className="py-2 px-3 text-white font-medium">{p.symbol}</td>
                      <td className="py-2 px-3 text-muted">{p.exchange}</td>
                      <td className="py-2 px-3">{fmt.qty(p.quantity)}</td>
                      <td className="py-2 px-3">{fmt.price(p.avgCost)}</td>
                      <td className="py-2 px-3">{fmt.price(p.lastPrice)}</td>
                      <td className="py-2 px-3">{fmt.compact(p.marketValue)}</td>
                      <td className={`py-2 px-3 font-medium ${changeClass(p.unrealizedPnl)}`}>{fmt.compact(p.unrealizedPnl)}</td>
                      <td className={`py-2 px-3 ${changeClass(p.unrealizedPnlPct)}`}>{fmt.pct(p.unrealizedPnlPct)}</td>
                    </tr>
                  ))}
                  {!portfolio?.positions?.length && (
                    <tr><td colSpan={8} className="text-center text-muted py-8">No positions</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-white mb-3">Allocation</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt.compact(v)} contentStyle={{ background: '#252A3D', border: '1px solid #2D3347', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-muted text-sm">No positions</p>}
            <div className="mt-2 space-y-1">
              {pieData.slice(0, 6).map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-muted">{d.name}</span>
                  </div>
                  <span className="text-white">{fmt.compact(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'performance' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Performance</h3>
            <div className="flex gap-1">
              {['1W','1M','3M','6M','1Y'].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded text-xs font-medium ${period === p ? 'bg-accent-blue text-white' : 'text-muted hover:text-white'}`}>{p}</button>
              ))}
            </div>
          </div>
          {perf ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={perf as any[]}>
                <XAxis dataKey="date" tick={{ fill: '#8B9CB6', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8B9CB6', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#252A3D', border: '1px solid #2D3347', borderRadius: 8 }} />
                <Line type="monotone" dataKey="value" stroke="#3D7FFF" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-muted">Loading performance data…</p>}
        </div>
      )}

      {tab === 'tca' && (
        <div className="card p-0">
          <div className="p-4 border-b border-border"><h3 className="font-semibold text-white">Transaction Cost Analysis</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Symbol','Side','Qty','Arrival Price','VWAP','Impl. Shortfall','Mkt Impact','Commission'].map(h => (
                    <th key={h} className="text-left text-muted font-medium py-2.5 px-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(tca as any[]).map((t: any, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-bg-hover">
                    <td className="py-2 px-3 text-white font-medium">{t.symbol}</td>
                    <td className={`py-2 px-3 font-bold text-xs ${t.side === 'BUY' ? 'text-bull' : 'text-bear'}`}>{t.side}</td>
                    <td className="py-2 px-3">{fmt.qty(t.quantity)}</td>
                    <td className="py-2 px-3">{fmt.price(t.arrivalPrice)}</td>
                    <td className="py-2 px-3">{fmt.price(t.vwap)}</td>
                    <td className={`py-2 px-3 ${changeClass(-t.implementationShortfall)}`}>{fmt.price(t.implementationShortfall)}</td>
                    <td className="py-2 px-3">{fmt.price(t.marketImpact)}</td>
                    <td className="py-2 px-3">{fmt.price(t.commissionCost)}</td>
                  </tr>
                ))}
                {tca.length === 0 && <tr><td colSpan={8} className="text-center text-muted py-8">No TCA data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
