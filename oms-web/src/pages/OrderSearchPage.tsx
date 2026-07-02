import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { ordersApi } from '../api'
import { fmt } from '../utils/formatters'
import StatusBadge from '../components/common/StatusBadge'
import { FullPageSpinner } from '../components/common/Spinner'
import type { Order } from '../types/api'

export default function OrderSearchPage() {
  const { accountId } = useAuthStore()
  const nav = useNavigate()

  const [params, setParams] = useState({
    symbol: '', isin: '', boid: '', dealerId: '', exchange: '',
    status: '', side: '', dateFrom: '', dateTo: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const set = (k: string, v: string) => setParams(p => ({ ...p, [k]: v }))

  const { data: results = [], isLoading, refetch } = useQuery({
    queryKey: ['order-search', params],
    queryFn: () => ordersApi.search({ accountId: accountId ?? undefined, ...Object.fromEntries(Object.entries(params).filter(([,v]) => v !== '')) }),
    enabled: submitted,
    staleTime: 30_000,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    refetch()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Advanced Order Search</h1>

      <form onSubmit={handleSearch} className="card">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><label className="label">Symbol</label><input className="input" value={params.symbol} onChange={e => set('symbol', e.target.value)} placeholder="BRAC" /></div>
          <div><label className="label">ISIN</label><input className="input" value={params.isin} onChange={e => set('isin', e.target.value)} placeholder="BD..." /></div>
          <div><label className="label">BOID</label><input className="input" value={params.boid} onChange={e => set('boid', e.target.value)} placeholder="BO Account" /></div>
          <div><label className="label">Dealer ID</label><input className="input" value={params.dealerId} onChange={e => set('dealerId', e.target.value)} placeholder="Dealer" /></div>
          <div>
            <label className="label">Exchange</label>
            <select className="input" value={params.exchange} onChange={e => set('exchange', e.target.value)}>
              <option value="">All</option><option value="DSE">DSE</option><option value="CSE">CSE</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={params.status} onChange={e => set('status', e.target.value)}>
              <option value="">All</option>
              {['PENDING','OPEN','PARTIAL','FILLED','CANCELLED','REJECTED'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Side</label>
            <select className="input" value={params.side} onChange={e => set('side', e.target.value)}>
              <option value="">All</option><option value="BUY">BUY</option><option value="SELL">SELL</option>
            </select>
          </div>
          <div><label className="label">Date From</label><input className="input" type="date" value={params.dateFrom} onChange={e => set('dateFrom', e.target.value)} /></div>
          <div><label className="label">Date To</label><input className="input" type="date" value={params.dateTo} onChange={e => set('dateTo', e.target.value)} /></div>
        </div>
        <button type="submit" className="btn-primary mt-4">Search Orders</button>
      </form>

      {isLoading && <FullPageSpinner />}

      {submitted && !isLoading && (
        <div className="card p-0">
          <div className="p-4 border-b border-border">
            <span className="text-muted text-sm">{results.length} result{results.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Side','Symbol','Exchange','Qty','Price','Status','Account','Date'].map(h => (
                    <th key={h} className="text-left text-muted font-medium py-3 px-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(results as Order[]).map(o => (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-bg-hover cursor-pointer" onClick={() => nav(`/orders/${o.id}`)}>
                    <td className={`py-2.5 px-3 font-bold text-xs ${o.side === 'BUY' ? 'text-bull' : 'text-bear'}`}>{o.side}</td>
                    <td className="py-2.5 px-3 text-white font-medium">{o.symbol}</td>
                    <td className="py-2.5 px-3 text-muted">{o.exchange}</td>
                    <td className="py-2.5 px-3">{fmt.qty(o.quantity)}</td>
                    <td className="py-2.5 px-3">{o.price != null ? fmt.price(o.price) : 'MKT'}</td>
                    <td className="py-2.5 px-3"><StatusBadge status={o.status} /></td>
                    <td className="py-2.5 px-3 text-muted">{o.accountId}</td>
                    <td className="py-2.5 px-3 text-muted text-xs">{fmt.datetime(o.createdAt)}</td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted py-10">No orders found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
