import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { templatesApi } from '../api'
import { fmt } from '../utils/formatters'
import { FullPageSpinner } from '../components/common/Spinner'
import Modal from '../components/common/Modal'
import { Plus, Trash2, Play } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function TemplatesPage() {
  const { accountId } = useAuthStore()
  const nav = useNavigate()
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ templateName: '', symbol: '', exchange: 'DSE', side: 'BUY', orderType: 'LIMIT', quantity: '', price: '', timeInForce: 'DAY' })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates', accountId],
    queryFn: () => templatesApi.list(accountId!),
    enabled: !!accountId,
  })

  const saveMut = useMutation({
    mutationFn: () => templatesApi.save({ ...form, accountId, quantity: parseFloat(form.quantity), price: form.price ? parseFloat(form.price) : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); setModal(false); toast.success('Template saved') },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => templatesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); toast.success('Deleted') },
  })

  const useTemplate = (t: any) => nav('/orders/new', { state: { ...t } })

  if (isLoading) return <FullPageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Order Templates</h1>
        <button className="btn-primary flex items-center gap-1 text-sm" onClick={() => setModal(true)}>
          <Plus size={14} /> New Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {(templates as any[]).map((t: any) => (
          <div key={t.id} className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white">{t.templateName}</h3>
              <div className="flex gap-2">
                <button className="text-accent-blue hover:opacity-80" onClick={() => useTemplate(t)} title="Use template">
                  <Play size={15} />
                </button>
                <button className="text-muted hover:text-bear" onClick={() => deleteMut.mutate(t.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Symbol</span>
                <span className="text-white font-medium">{t.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Side / Type</span>
                <span className={t.side === 'BUY' ? 'text-bull font-bold' : 'text-bear font-bold'}>{t.side}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Exchange</span>
                <span className="text-muted">{t.exchange}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Qty / Price</span>
                <span className="text-white">{fmt.qty(t.quantity)} @ {t.price ? fmt.price(t.price) : 'MKT'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">TIF</span>
                <span className="text-muted">{t.timeInForce}</span>
              </div>
            </div>
          </div>
        ))}
        {templates.length === 0 && <p className="text-muted">No templates yet. Save commonly used orders as templates.</p>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New Order Template">
        <div className="space-y-3">
          <div><label className="label">Template Name</label><input className="input" value={form.templateName} onChange={e => set('templateName', e.target.value)} placeholder="My BRAC Buy" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">Symbol</label><input className="input uppercase" value={form.symbol} onChange={e => set('symbol', e.target.value)} /></div>
            <div><label className="label">Exchange</label><select className="input" value={form.exchange} onChange={e => set('exchange', e.target.value)}><option>DSE</option><option>CSE</option></select></div>
            <div><label className="label">Side</label><select className="input" value={form.side} onChange={e => set('side', e.target.value)}><option>BUY</option><option>SELL</option></select></div>
            <div><label className="label">Order Type</label><select className="input" value={form.orderType} onChange={e => set('orderType', e.target.value)}><option>LIMIT</option><option>MARKET</option></select></div>
            <div><label className="label">Quantity</label><input className="input" type="number" value={form.quantity} onChange={e => set('quantity', e.target.value)} /></div>
            <div><label className="label">Price</label><input className="input" type="number" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" /></div>
            <div><label className="label">Time in Force</label><select className="input" value={form.timeInForce} onChange={e => set('timeInForce', e.target.value)}><option>DAY</option><option>GTC</option><option>IOC</option></select></div>
          </div>
          <button className="btn-primary w-full" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>Save Template</button>
        </div>
      </Modal>
    </div>
  )
}
