import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { parentOrderApi } from '../api'
import { fmt } from '../utils/formatters'
import { FullPageSpinner } from '../components/common/Spinner'
import StatusBadge from '../components/common/StatusBadge'
import Modal from '../components/common/Modal'
import type { ExchangeType, OrderSide, AssetClass } from '../types/api'
import toast from 'react-hot-toast'
import { Plus, ChevronDown, ChevronRight } from 'lucide-react'

export default function ParentOrdersPage() {
  const { accountId } = useAuthStore()
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({
    symbol: '', exchange: 'DSE' as ExchangeType, side: 'BUY' as OrderSide,
    assetClass: 'EQUITY' as AssetClass, totalQuantity: '', priceLimit: '',
    numSlices: '3', boid: '', dealerId: '', notes: '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['parent-orders', accountId],
    queryFn: () => parentOrderApi.list(accountId!),
    enabled: !!accountId,
    refetchInterval: 10_000,
  })

  const submitMut = useMutation({
    mutationFn: () => parentOrderApi.submit({
      accountId,
      symbol: form.symbol.toUpperCase(),
      exchange: form.exchange,
      side: form.side,
      assetClass: form.assetClass,
      totalQuantity: parseFloat(form.totalQuantity),
      priceLimit: form.priceLimit ? parseFloat(form.priceLimit) : undefined,
      numSlices: parseInt(form.numSlices),
      boid: form.boid || undefined,
      dealerId: form.dealerId || undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['parent-orders'] }); setModal(false); toast.success('Parent order created') },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  const toggle = (id: string) => {
    const s = new Set(expanded)
    s.has(id) ? s.delete(id) : s.add(id)
    setExpanded(s)
  }

  if (isLoading) return <FullPageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Parent Orders</h1>
        <button className="btn-primary flex items-center gap-1 text-sm" onClick={() => setModal(true)}>
          <Plus size={14} /> New Parent Order
        </button>
      </div>

      <div className="space-y-3">
        {(orders as any[]).map((po: any) => (
          <div key={po.id} className="card">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggle(po.id)}>
              <div className="flex items-center gap-3">
                {expanded.has(po.id) ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}
                <span className={`text-xs font-bold ${po.side === 'BUY' ? 'text-bull' : 'text-bear'}`}>{po.side}</span>
                <span className="text-white font-medium">{po.symbol}</span>
                <span className="text-muted text-sm">{po.exchange}</span>
                <StatusBadge status={po.status} />
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-right">
                  <p className="text-muted text-xs">Total / Remaining</p>
                  <p className="text-white">{fmt.qty(po.totalQuantity)} / {fmt.qty(po.remainingQuantity)}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted text-xs">Slices</p>
                  <p className="text-white">{po.completedSlices}/{po.numSlices}</p>
                </div>
                {po.priceLimit && (
                  <div className="text-right">
                    <p className="text-muted text-xs">Limit</p>
                    <p className="text-white">{fmt.price(po.priceLimit)}</p>
                  </div>
                )}
                <div className="text-right">
                  <p className="text-muted text-xs">Created</p>
                  <p className="text-muted text-xs">{fmt.datetime(po.createdAt)}</p>
                </div>
              </div>
            </div>

            {expanded.has(po.id) && po.children?.length > 0 && (
              <div className="mt-3 pl-7 space-y-1">
                <p className="text-muted text-xs mb-1">Child Orders</p>
                {po.children.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-4 text-sm bg-bg-secondary rounded px-3 py-1.5">
                    <span className={`text-xs font-bold ${c.side === 'BUY' ? 'text-bull' : 'text-bear'}`}>{c.side}</span>
                    <span className="text-white">{fmt.qty(c.quantity)}</span>
                    <span className="text-muted">{c.price != null ? fmt.price(c.price) : 'MKT'}</span>
                    <StatusBadge status={c.status} />
                    <span className="text-muted text-xs ml-auto">{fmt.datetime(c.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {orders.length === 0 && <p className="text-muted">No parent orders</p>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New Parent Order (Block Split)" size="lg">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Symbol</label><input className="input uppercase" value={form.symbol} onChange={e => set('symbol', e.target.value)} /></div>
          <div>
            <label className="label">Exchange</label>
            <select className="input" value={form.exchange} onChange={e => set('exchange', e.target.value as ExchangeType)}>
              <option>DSE</option><option>CSE</option>
            </select>
          </div>
          <div>
            <label className="label">Side</label>
            <select className="input" value={form.side} onChange={e => set('side', e.target.value as OrderSide)}>
              <option>BUY</option><option>SELL</option>
            </select>
          </div>
          <div>
            <label className="label">Asset Class</label>
            <select className="input" value={form.assetClass} onChange={e => set('assetClass', e.target.value as AssetClass)}>
              {['EQUITY','BOND','ETF','MUTUAL_FUND','T_BILL','T_BOND'].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div><label className="label">Total Quantity</label><input className="input" type="number" value={form.totalQuantity} onChange={e => set('totalQuantity', e.target.value)} /></div>
          <div><label className="label">Price Limit (optional)</label><input className="input" type="number" step="0.01" value={form.priceLimit} onChange={e => set('priceLimit', e.target.value)} /></div>
          <div><label className="label">Number of Slices</label><input className="input" type="number" min="1" max="20" value={form.numSlices} onChange={e => set('numSlices', e.target.value)} /></div>
          <div><label className="label">BOID</label><input className="input" value={form.boid} onChange={e => set('boid', e.target.value)} placeholder="Optional" /></div>
          <div><label className="label">Dealer ID</label><input className="input" value={form.dealerId} onChange={e => set('dealerId', e.target.value)} placeholder="Optional" /></div>
          <div className="col-span-2"><label className="label">Notes</label><input className="input" value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
        </div>
        <p className="text-muted text-xs mt-3">Total quantity will be split evenly into {form.numSlices} child orders.</p>
        <button className="btn-primary w-full mt-4" onClick={() => submitMut.mutate()} disabled={submitMut.isPending}>
          {submitMut.isPending ? 'Creating…' : 'Create Parent Order'}
        </button>
      </Modal>
    </div>
  )
}
