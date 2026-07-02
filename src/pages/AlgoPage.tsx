import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { algoApi } from '../api'
import { fmt } from '../utils/formatters'
import { FullPageSpinner } from '../components/common/Spinner'
import StatusBadge from '../components/common/StatusBadge'
import Modal from '../components/common/Modal'
import type { AlgoType, ExchangeType, OrderSide } from '../types/api'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'

const ALGO_TYPES: AlgoType[] = ['TWAP','VWAP','POV','ICEBERG','SNIPER','STEALTH','ARRIVAL_PRICE','LIQUIDITY_SEEKING']

export default function AlgoPage() {
  const { accountId } = useAuthStore()
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({
    symbol: '', exchange: 'DSE' as ExchangeType, side: 'BUY' as OrderSide,
    algoType: 'TWAP' as AlgoType, totalQuantity: '', priceLimit: '',
    startTime: '', endTime: '', participationRate: '10',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['algo', accountId],
    queryFn: () => algoApi.list(accountId!),
    enabled: !!accountId,
    refetchInterval: 5_000,
  })

  const submitMut = useMutation({
    mutationFn: () => algoApi.submit({
      accountId,
      symbol: form.symbol.toUpperCase(),
      exchange: form.exchange,
      side: form.side,
      algoType: form.algoType,
      totalQuantity: parseFloat(form.totalQuantity),
      priceLimit: form.priceLimit ? parseFloat(form.priceLimit) : undefined,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      participationRate: form.algoType === 'POV' ? parseFloat(form.participationRate) : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['algo'] }); setModal(false); toast.success('Algo order submitted') },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  const cancelMut = useMutation({
    mutationFn: (id: string) => algoApi.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['algo'] }); toast.success('Cancelled') },
  })

  if (isLoading) return <FullPageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Algo Orders</h1>
        <button className="btn-primary flex items-center gap-1 text-sm" onClick={() => setModal(true)}>
          <Plus size={14} /> New Algo Order
        </button>
      </div>

      <div className="card p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Side','Symbol','Exchange','Algo','Total Qty','Executed','Remaining','Price Limit','Status','Created'].map(h => (
                  <th key={h} className="text-left text-muted font-medium py-3 px-3 whitespace-nowrap">{h}</th>
                ))}
                <th className="py-3 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(orders as any[]).map((o: any) => (
                <tr key={o.id} className="border-b border-border/50 hover:bg-bg-hover">
                  <td className={`py-2.5 px-3 font-bold text-xs ${o.side === 'BUY' ? 'text-bull' : 'text-bear'}`}>{o.side}</td>
                  <td className="py-2.5 px-3 text-white font-medium">{o.symbol}</td>
                  <td className="py-2.5 px-3 text-muted">{o.exchange}</td>
                  <td className="py-2.5 px-3 text-accent-blue font-medium">{o.algoType}</td>
                  <td className="py-2.5 px-3">{fmt.qty(o.totalQuantity)}</td>
                  <td className="py-2.5 px-3 text-bull">{fmt.qty(o.executedQuantity)}</td>
                  <td className="py-2.5 px-3 text-muted">{fmt.qty(o.remainingQuantity)}</td>
                  <td className="py-2.5 px-3">{o.priceLimit ? fmt.price(o.priceLimit) : '—'}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={o.status} /></td>
                  <td className="py-2.5 px-3 text-muted text-xs">{fmt.datetime(o.createdAt)}</td>
                  <td className="py-2.5 px-3">
                    {o.status === 'ACTIVE' && (
                      <button className="text-xs text-bear hover:underline" onClick={() => cancelMut.mutate(o.id)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={11} className="text-center text-muted py-10">No algo orders</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New Algo Order" size="lg">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Symbol</label><input className="input uppercase" value={form.symbol} onChange={e => set('symbol', e.target.value)} /></div>
          <div>
            <label className="label">Exchange</label>
            <select className="input" value={form.exchange} onChange={e => set('exchange', e.target.value as ExchangeType)}>
              <option value="DSE">DSE</option><option value="CSE">CSE</option>
            </select>
          </div>
          <div>
            <label className="label">Side</label>
            <select className="input" value={form.side} onChange={e => set('side', e.target.value as OrderSide)}>
              <option value="BUY">BUY</option><option value="SELL">SELL</option>
            </select>
          </div>
          <div>
            <label className="label">Algo Type</label>
            <select className="input" value={form.algoType} onChange={e => set('algoType', e.target.value as AlgoType)}>
              {ALGO_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div><label className="label">Total Quantity</label><input className="input" type="number" value={form.totalQuantity} onChange={e => set('totalQuantity', e.target.value)} /></div>
          <div><label className="label">Price Limit</label><input className="input" type="number" step="0.01" value={form.priceLimit} onChange={e => set('priceLimit', e.target.value)} placeholder="Optional" /></div>
          <div><label className="label">Start Time</label><input className="input" type="datetime-local" value={form.startTime} onChange={e => set('startTime', e.target.value)} /></div>
          <div><label className="label">End Time</label><input className="input" type="datetime-local" value={form.endTime} onChange={e => set('endTime', e.target.value)} /></div>
          {form.algoType === 'POV' && (
            <div><label className="label">Participation Rate (%)</label><input className="input" type="number" min="1" max="50" value={form.participationRate} onChange={e => set('participationRate', e.target.value)} /></div>
          )}
        </div>
        <button className="btn-primary w-full mt-4" onClick={() => submitMut.mutate()} disabled={submitMut.isPending}>
          {submitMut.isPending ? 'Submitting…' : 'Submit Algo Order'}
        </button>
      </Modal>
    </div>
  )
}
