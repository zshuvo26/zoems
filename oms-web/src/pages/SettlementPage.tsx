import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { settlementApi } from '../api'
import { fmt } from '../utils/formatters'
import { FullPageSpinner } from '../components/common/Spinner'
import StatusBadge from '../components/common/StatusBadge'

export default function SettlementPage() {
  const { accountId } = useAuthStore()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data: settlements = [], isLoading } = useQuery({
    queryKey: ['settlement', accountId, from, to],
    queryFn: () => settlementApi.list(accountId!, from || undefined, to || undefined),
    enabled: !!accountId,
  })

  const { data: summary } = useQuery({
    queryKey: ['settlement-summary', accountId],
    queryFn: () => settlementApi.summary(accountId!),
    enabled: !!accountId,
  })

  const pending = (settlements as any[]).filter(s => s.status === 'PENDING').length
  const today = new Date().toISOString().slice(0,10)
  const dueToday = (settlements as any[]).filter(s => s.settlementDate === today).length

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Settlement (T+2)</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="card"><p className="text-muted text-xs">Pending</p><p className="text-xl font-bold text-amber mt-1">{pending}</p></div>
        <div className="card"><p className="text-muted text-xs">Due Today</p><p className="text-xl font-bold text-bear mt-1">{dueToday}</p></div>
        <div className="card"><p className="text-muted text-xs">Total Records</p><p className="text-xl font-bold text-white mt-1">{settlements.length}</p></div>
      </div>

      <div className="flex gap-3 items-end">
        <div><label className="label">From</label><input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div><label className="label">To</label><input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
      </div>

      {isLoading ? <FullPageSpinner /> : (
        <div className="card p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Trade Date','Settlement Date','Symbol','Side','Qty','Price','Gross','Commission','Net Amount','Status'].map(h => (
                  <th key={h} className="text-left text-muted font-medium py-3 px-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(settlements as any[]).map((s: any) => (
                <tr key={s.id} className={`border-b border-border/50 hover:bg-bg-hover ${s.settlementDate === today ? 'bg-amber/5' : ''}`}>
                  <td className="py-2.5 px-3 text-muted text-xs">{fmt.date(s.tradeDate)}</td>
                  <td className={`py-2.5 px-3 text-xs font-medium ${s.settlementDate === today ? 'text-amber' : 'text-muted'}`}>{fmt.date(s.settlementDate)}</td>
                  <td className="py-2.5 px-3 text-white font-medium">{s.symbol}</td>
                  <td className={`py-2.5 px-3 font-bold text-xs ${s.side === 'BUY' ? 'text-bull' : 'text-bear'}`}>{s.side}</td>
                  <td className="py-2.5 px-3">{fmt.qty(s.quantity)}</td>
                  <td className="py-2.5 px-3">{fmt.price(s.price)}</td>
                  <td className="py-2.5 px-3">{fmt.compact(s.grossAmount)}</td>
                  <td className="py-2.5 px-3 text-muted">{fmt.price(s.commission)}</td>
                  <td className="py-2.5 px-3 font-medium">{fmt.compact(s.netAmount)}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
              {settlements.length === 0 && <tr><td colSpan={10} className="text-center text-muted py-8">No settlement records</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
