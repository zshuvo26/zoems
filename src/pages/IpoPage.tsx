import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { ipoApi } from '../api'
import { fmt } from '../utils/formatters'
import { FullPageSpinner } from '../components/common/Spinner'
import StatusBadge from '../components/common/StatusBadge'
import Modal from '../components/common/Modal'
import toast from 'react-hot-toast'

export default function IpoPage() {
  const { accountId } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'available'|'applications'>('available')
  const [applyModal, setApplyModal] = useState<any>(null)
  const [quantity, setQuantity] = useState('')
  const [boid, setBoid] = useState('')

  const { data: ipos = [], isLoading: ipoLoad } = useQuery({
    queryKey: ['ipos'],
    queryFn: () => ipoApi.list(),
  })

  const { data: applications = [], isLoading: appLoad } = useQuery({
    queryKey: ['ipo-applications', accountId],
    queryFn: () => ipoApi.applications(accountId!),
    enabled: !!accountId && tab === 'applications',
  })

  const applyMut = useMutation({
    mutationFn: () => ipoApi.apply({ accountId, symbol: applyModal.symbol, quantity: parseInt(quantity), boid }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ipo-applications'] }); setApplyModal(null); setQuantity(''); toast.success('IPO application submitted') },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">IPO</h1>

      <div className="flex gap-2 border-b border-border pb-2">
        {(['available','applications'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium transition-colors capitalize ${tab === t ? 'text-accent-blue border-b-2 border-accent-blue' : 'text-muted hover:text-white'}`}>
            {t === 'available' ? 'Available IPOs' : 'My Applications'}
          </button>
        ))}
      </div>

      {tab === 'available' && (
        ipoLoad ? <FullPageSpinner /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(ipos as any[]).map((ipo: any) => (
              <div key={ipo.id ?? ipo.symbol} className="card">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-white">{ipo.symbol}</h3>
                    <p className="text-muted text-sm">{ipo.companyName}</p>
                  </div>
                  <span className="text-xs bg-accent-blue/20 text-accent-blue px-2 py-0.5 rounded">{ipo.sector ?? 'IPO'}</span>
                </div>
                <div className="space-y-1 text-sm mb-4">
                  <div className="flex justify-between"><span className="text-muted">Issue Price</span><span className="text-white font-medium">{fmt.price(ipo.issuePrice)}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Open Date</span><span className="text-muted">{fmt.date(ipo.openDate)}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Close Date</span><span className="text-muted">{fmt.date(ipo.closeDate)}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Lot Size</span><span className="text-muted">{ipo.lotSize ?? '—'}</span></div>
                </div>
                <button className="btn-primary w-full text-sm" onClick={() => setApplyModal(ipo)}>Apply</button>
              </div>
            ))}
            {ipos.length === 0 && <p className="text-muted">No IPOs available</p>}
          </div>
        )
      )}

      {tab === 'applications' && (
        appLoad ? <FullPageSpinner /> : (
          <div className="card p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Symbol','Qty Applied','Qty Allotted','Issue Price','Total Amount','Status','Applied At'].map(h => (
                    <th key={h} className="text-left text-muted font-medium py-3 px-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(applications as any[]).map((a: any) => (
                  <tr key={a.id} className="border-b border-border/50 hover:bg-bg-hover">
                    <td className="py-2.5 px-3 text-white font-medium">{a.symbol}</td>
                    <td className="py-2.5 px-3">{fmt.qty(a.appliedQuantity)}</td>
                    <td className="py-2.5 px-3">{a.allottedQuantity != null ? fmt.qty(a.allottedQuantity) : '—'}</td>
                    <td className="py-2.5 px-3">{fmt.price(a.issuePrice)}</td>
                    <td className="py-2.5 px-3">{fmt.compact(a.totalAmount)}</td>
                    <td className="py-2.5 px-3"><StatusBadge status={a.status} /></td>
                    <td className="py-2.5 px-3 text-muted text-xs">{fmt.datetime(a.appliedAt)}</td>
                  </tr>
                ))}
                {applications.length === 0 && <tr><td colSpan={7} className="text-center text-muted py-8">No applications</td></tr>}
              </tbody>
            </table>
          </div>
        )
      )}

      <Modal open={!!applyModal} onClose={() => setApplyModal(null)} title={`Apply for ${applyModal?.symbol} IPO`}>
        <div className="space-y-3">
          <div className="bg-bg-secondary rounded-lg p-3 text-sm">
            <div className="flex justify-between mb-1"><span className="text-muted">Issue Price</span><span className="text-white font-medium">{fmt.price(applyModal?.issuePrice)}</span></div>
            {quantity && <div className="flex justify-between"><span className="text-muted">Total Amount</span><span className="text-white font-medium">{fmt.price((applyModal?.issuePrice ?? 0) * parseInt(quantity || '0'))}</span></div>}
          </div>
          <div><label className="label">Quantity (shares)</label><input className="input" type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
          <div><label className="label">BOID</label><input className="input" value={boid} onChange={e => setBoid(e.target.value)} placeholder="BO Account ID" /></div>
          <button className="btn-primary w-full" onClick={() => applyMut.mutate()} disabled={applyMut.isPending || !quantity}>
            {applyMut.isPending ? 'Applying…' : 'Submit Application'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
