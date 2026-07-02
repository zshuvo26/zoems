import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { corporateActionsApi } from '../api'
import { fmt } from '../utils/formatters'
import { FullPageSpinner } from '../components/common/Spinner'

export default function CorporateActionsPage() {
  const [exchange, setExchange] = useState('')

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['corporate-actions', exchange],
    queryFn: () => corporateActionsApi.list(exchange || undefined),
    refetchInterval: 300_000,
  })

  if (isLoading) return <FullPageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Corporate Actions</h1>
        <select className="input w-32" value={exchange} onChange={e => setExchange(e.target.value)}>
          <option value="">All</option><option value="DSE">DSE</option><option value="CSE">CSE</option>
        </select>
      </div>

      <div className="card p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['Symbol','Exchange','Action Type','Ex-Date','Record Date','Payment Date','Details'].map(h => (
                <th key={h} className="text-left text-muted font-medium py-3 px-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(actions as any[]).map((a: any) => (
              <tr key={a.id} className="border-b border-border/50 hover:bg-bg-hover">
                <td className="py-2.5 px-3 text-white font-medium">{a.symbol}</td>
                <td className="py-2.5 px-3 text-muted">{a.exchange}</td>
                <td className="py-2.5 px-3">
                  <span className="text-xs bg-accent-blue/20 text-accent-blue px-2 py-0.5 rounded">{a.actionType}</span>
                </td>
                <td className="py-2.5 px-3 text-white">{fmt.date(a.exDate)}</td>
                <td className="py-2.5 px-3 text-muted">{a.recordDate ? fmt.date(a.recordDate) : '—'}</td>
                <td className="py-2.5 px-3 text-muted">{a.paymentDate ? fmt.date(a.paymentDate) : '—'}</td>
                <td className="py-2.5 px-3 text-muted text-xs max-w-xs truncate">
                  {Object.entries(a.details ?? {}).map(([k,v]) => `${k}: ${v}`).join(', ')}
                </td>
              </tr>
            ))}
            {actions.length === 0 && <tr><td colSpan={7} className="text-center text-muted py-8">No corporate actions</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
