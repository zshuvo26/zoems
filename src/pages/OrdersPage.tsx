import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { ordersApi } from '../api'
import { fmt } from '../utils/formatters'
import { FullPageSpinner } from '../components/common/Spinner'
import StatusBadge from '../components/common/StatusBadge'
import type { Order } from '../types/api'
import toast from 'react-hot-toast'
import { Plus, Search, XCircle } from 'lucide-react'

const STATUS_FILTERS = ['ALL', 'PENDING', 'OPEN', 'PARTIAL', 'FILLED', 'CANCELLED', 'REJECTED']

export default function OrdersPage() {
  const { accountId } = useAuthStore()
  const nav = useNavigate()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', accountId],
    queryFn: () => ordersApi.list(accountId!),
    enabled: !!accountId,
    refetchInterval: 5_000,
  })

  const cancelMut = useMutation({
    mutationFn: (id: string) => ordersApi.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast.success('Order cancelled') },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Cancel failed'),
  })

  const bulkCancelMut = useMutation({
    mutationFn: () => ordersApi.bulkCancel([...selected]),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); setSelected(new Set()); toast.success('Orders cancelled') },
  })

  const filtered = statusFilter === 'ALL' ? orders : orders.filter((o: Order) => o.status === statusFilter)

  const toggleSelect = (id: string) => {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  if (isLoading) return <FullPageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Orders</h1>
        <div className="flex gap-2">
          <button className="btn-outline flex items-center gap-1 text-sm" onClick={() => nav('/orders/search')}>
            <Search size={14} /> Search
          </button>
          {selected.size > 0 && (
            <button className="btn-danger flex items-center gap-1 text-sm" onClick={() => bulkCancelMut.mutate()}>
              <XCircle size={14} /> Cancel ({selected.size})
            </button>
          )}
          <button className="btn-primary flex items-center gap-1 text-sm" onClick={() => nav('/orders/new')}>
            <Plus size={14} /> New Order
          </button>
        </div>
      </div>

      <div className="flex gap-1 flex-wrap">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? 'bg-accent-blue text-white' : 'bg-bg-card text-muted hover:text-white border border-border'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="card p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 px-3 w-8">
                  <input type="checkbox" className="accent-accent-blue" onChange={e => {
                    const cancellable = filtered.filter(o => ['PENDING','OPEN','PARTIAL'].includes(o.status))
                    setSelected(e.target.checked ? new Set(cancellable.map(o => o.id)) : new Set())
                  }} />
                </th>
                {['Side','Symbol','Exchange','Type','Qty','Filled','Price','Status','Time','Actions'].map(h => (
                  <th key={h} className="text-left text-muted font-medium py-3 px-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o: Order) => (
                <tr key={o.id} className="border-b border-border/50 hover:bg-bg-hover transition-colors">
                  <td className="py-2.5 px-3">
                    {['PENDING','OPEN','PARTIAL'].includes(o.status) && (
                      <input type="checkbox" className="accent-accent-blue" checked={selected.has(o.id)} onChange={() => toggleSelect(o.id)} />
                    )}
                  </td>
                  <td className={`py-2.5 px-3 font-bold text-xs ${o.side === 'BUY' ? 'text-bull' : 'text-bear'}`}>{o.side}</td>
                  <td
                    className="py-2.5 px-3 text-white font-medium cursor-pointer hover:text-accent-blue"
                    onClick={() => nav(`/orders/${o.id}`)}
                  >{o.symbol}</td>
                  <td className="py-2.5 px-3 text-muted">{o.exchange}</td>
                  <td className="py-2.5 px-3 text-muted">{o.orderType}</td>
                  <td className="py-2.5 px-3">{fmt.qty(o.quantity)}</td>
                  <td className="py-2.5 px-3 text-muted">{fmt.qty(o.executedQuantity)}</td>
                  <td className="py-2.5 px-3">{o.price != null ? fmt.price(o.price) : 'MKT'}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={o.status} /></td>
                  <td className="py-2.5 px-3 text-muted text-xs">{fmt.datetime(o.createdAt)}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex gap-1">
                      <button className="text-xs text-accent-blue hover:underline" onClick={() => nav(`/orders/${o.id}`)}>View</button>
                      {['PENDING','OPEN'].includes(o.status) && (
                        <button className="text-xs text-bear hover:underline" onClick={() => cancelMut.mutate(o.id)}>Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="text-center text-muted py-10">No orders</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
