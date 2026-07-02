import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { alertsApi } from '../api'
import { fmt } from '../utils/formatters'
import { FullPageSpinner } from '../components/common/Spinner'
import Modal from '../components/common/Modal'
import { Plus, Trash2, Bell, BellOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AlertsPage() {
  const { accountId } = useAuthStore()
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ symbol: '', exchange: 'DSE', condition: 'ABOVE', targetPrice: '', percentThreshold: '' })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts', accountId],
    queryFn: () => alertsApi.list(accountId!),
    enabled: !!accountId,
    refetchInterval: 30_000,
  })

  const createMut = useMutation({
    mutationFn: () => alertsApi.create({ ...form, accountId, targetPrice: form.targetPrice ? parseFloat(form.targetPrice) : undefined, percentThreshold: form.percentThreshold ? parseFloat(form.percentThreshold) : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alerts'] }); setModal(false); toast.success('Alert created') },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  const toggleMut = useMutation({
    mutationFn: (id: string) => alertsApi.toggle(id, accountId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => alertsApi.delete(id, accountId!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alerts'] }); toast.success('Alert deleted') },
  })

  if (isLoading) return <FullPageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Price Alerts</h1>
        <button className="btn-primary flex items-center gap-1 text-sm" onClick={() => setModal(true)}>
          <Plus size={14} /> New Alert
        </button>
      </div>

      <div className="space-y-2">
        {(alerts as any[]).map((a: any) => (
          <div key={a.id} className={`card flex items-center justify-between ${a.triggered ? 'border-bull/40' : ''}`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{a.symbol}</span>
                <span className="text-muted text-xs">{a.exchange}</span>
                {a.triggered && <span className="text-xs bg-bull/20 text-bull px-2 py-0.5 rounded">TRIGGERED</span>}
                {!a.triggered && !a.active && <span className="text-xs bg-muted/20 text-muted px-2 py-0.5 rounded">INACTIVE</span>}
              </div>
              <p className="text-muted text-sm mt-0.5">
                {a.condition} {a.targetPrice != null ? fmt.price(a.targetPrice) : `${a.percentThreshold}%`}
                {a.triggeredAt && ` · Triggered ${fmt.datetime(a.triggeredAt)}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!a.triggered && (
                <button onClick={() => toggleMut.mutate(a.id)} className="text-muted hover:text-white transition-colors">
                  {a.active ? <Bell size={16} className="text-accent-blue" /> : <BellOff size={16} />}
                </button>
              )}
              <button onClick={() => deleteMut.mutate(a.id)} className="text-muted hover:text-bear transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
        {alerts.length === 0 && <p className="text-muted">No price alerts. Create one to get notified when a stock hits your target.</p>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New Price Alert">
        <div className="space-y-3">
          <div><label className="label">Symbol</label><input className="input uppercase" value={form.symbol} onChange={e => set('symbol', e.target.value)} placeholder="BRAC" /></div>
          <div>
            <label className="label">Exchange</label>
            <select className="input" value={form.exchange} onChange={e => set('exchange', e.target.value)}>
              <option>DSE</option><option>CSE</option>
            </select>
          </div>
          <div>
            <label className="label">Condition</label>
            <select className="input" value={form.condition} onChange={e => set('condition', e.target.value)}>
              <option value="ABOVE">Price Above</option>
              <option value="BELOW">Price Below</option>
              <option value="PCT_UP">% Up from close</option>
              <option value="PCT_DOWN">% Down from close</option>
            </select>
          </div>
          {['ABOVE','BELOW'].includes(form.condition) ? (
            <div><label className="label">Target Price (৳)</label><input className="input" type="number" step="0.01" value={form.targetPrice} onChange={e => set('targetPrice', e.target.value)} /></div>
          ) : (
            <div><label className="label">% Threshold</label><input className="input" type="number" step="0.1" value={form.percentThreshold} onChange={e => set('percentThreshold', e.target.value)} /></div>
          )}
          <button className="btn-primary w-full" onClick={() => createMut.mutate()} disabled={createMut.isPending}>
            Create Alert
          </button>
        </div>
      </Modal>
    </div>
  )
}
