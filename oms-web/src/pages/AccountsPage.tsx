import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi } from '../api'
import { fmt } from '../utils/formatters'
import { FullPageSpinner } from '../components/common/Spinner'
import StatusBadge from '../components/common/StatusBadge'
import Modal from '../components/common/Modal'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AccountsPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ accountNumber: '', clientName: '', clientCode: '', boid: '', email: '', phone: '' })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
    refetchInterval: 60_000,
  })

  const createMut = useMutation({
    mutationFn: () => accountsApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); setModal(false); toast.success('Account created') },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  if (isLoading) return <FullPageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Accounts</h1>
        <button className="btn-primary flex items-center gap-1 text-sm" onClick={() => setModal(true)}>
          <Plus size={14} /> New Account
        </button>
      </div>

      <div className="card p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['Account No','Client Name','BOID','Cash Balance','Buying Power','Status','Created'].map(h => (
                <th key={h} className="text-left text-muted font-medium py-3 px-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(accounts as any[]).map((a: any) => (
              <tr key={a.id} className="border-b border-border/50 hover:bg-bg-hover">
                <td className="py-2.5 px-3 text-accent-blue font-medium">{a.accountNumber}</td>
                <td className="py-2.5 px-3 text-white">{a.clientName}</td>
                <td className="py-2.5 px-3 text-muted">{a.boid ?? '—'}</td>
                <td className="py-2.5 px-3">{fmt.compact(a.cashBalance)}</td>
                <td className="py-2.5 px-3">{fmt.compact(a.buyingPower)}</td>
                <td className="py-2.5 px-3"><StatusBadge status={a.status} /></td>
                <td className="py-2.5 px-3 text-muted text-xs">{fmt.date(a.createdAt)}</td>
              </tr>
            ))}
            {accounts.length === 0 && <tr><td colSpan={7} className="text-center text-muted py-8">No accounts</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New Account">
        <div className="space-y-3">
          {[['Account Number','accountNumber'],['Client Name','clientName'],['Client Code','clientCode'],['BOID','boid'],['Email','email'],['Phone','phone']].map(([label, key]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input className="input" value={(form as any)[key]} onChange={e => set(key, e.target.value)} />
            </div>
          ))}
          <button className="btn-primary w-full" onClick={() => createMut.mutate()} disabled={createMut.isPending}>
            {createMut.isPending ? 'Creating…' : 'Create Account'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
