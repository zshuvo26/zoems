import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { watchlistApi } from '../api'
import { fmt, changeClass } from '../utils/formatters'
import { FullPageSpinner } from '../components/common/Spinner'
import { Trash2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function WatchlistPage() {
  const { accountId } = useAuthStore()
  const qc = useQueryClient()
  const nav = useNavigate()
  const [symbol, setSymbol] = useState('')
  const [exchange, setExchange] = useState('DSE')

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['watchlist', accountId],
    queryFn: () => watchlistApi.get(accountId!),
    enabled: !!accountId,
    refetchInterval: 15_000,
  })

  const addMut = useMutation({
    mutationFn: () => watchlistApi.add(accountId!, symbol.toUpperCase(), exchange),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['watchlist'] }); setSymbol(''); toast.success('Added to watchlist') },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  const removeMut = useMutation({
    mutationFn: (id: string) => watchlistApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  })

  if (isLoading) return <FullPageSpinner />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Watchlist</h1>

      <div className="card">
        <div className="flex gap-2">
          <input className="input max-w-xs" placeholder="Symbol (e.g. BRAC)" value={symbol} onChange={e => setSymbol(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && symbol && addMut.mutate()} />
          <select className="input w-28" value={exchange} onChange={e => setExchange(e.target.value)}>
            <option>DSE</option><option>CSE</option>
          </select>
          <button className="btn-primary flex items-center gap-1" onClick={() => addMut.mutate()} disabled={!symbol}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="card p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['Symbol','Exchange','Last Price','Change','% Change','Added','Actions'].map(h => (
                <th key={h} className="text-left text-muted font-medium py-3 px-4 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(items as any[]).map((item: any) => (
              <tr key={item.id} className="border-b border-border/50 hover:bg-bg-hover cursor-pointer" onClick={() => nav(`/market/${item.exchange}/${item.symbol}`)}>
                <td className="py-2.5 px-4 text-white font-medium">{item.symbol}</td>
                <td className="py-2.5 px-4 text-muted">{item.exchange}</td>
                <td className="py-2.5 px-4">{fmt.price(item.lastPrice)}</td>
                <td className={`py-2.5 px-4 font-medium ${changeClass(item.change)}`}>{item.change != null ? fmt.price(item.change) : '—'}</td>
                <td className={`py-2.5 px-4 ${changeClass(item.changePercent)}`}>{fmt.pct(item.changePercent)}</td>
                <td className="py-2.5 px-4 text-muted text-xs">{fmt.date(item.addedAt)}</td>
                <td className="py-2.5 px-4" onClick={e => e.stopPropagation()}>
                  <button className="text-bear hover:opacity-80" onClick={() => removeMut.mutate(item.id)}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={7} className="text-center text-muted py-10">No symbols in watchlist. Add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
