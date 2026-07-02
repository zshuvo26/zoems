import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { ledgerApi } from '../api'
import { fmt } from '../utils/formatters'
import { FullPageSpinner } from '../components/common/Spinner'

export default function LedgerPage() {
  const { accountId } = useAuthStore()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ['ledger', accountId, from, to],
    queryFn: () => ledgerApi.entries(accountId!, from || undefined, to || undefined),
    enabled: !!accountId,
  })

  const { data: summary } = useQuery({
    queryKey: ['ledger-summary', accountId],
    queryFn: () => ledgerApi.summary(accountId!),
    enabled: !!accountId,
  })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Cash Ledger</h1>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[['Opening Balance', (summary as any).openingBalance], ['Total Credits', (summary as any).totalCredits], ['Total Debits', (summary as any).totalDebits]].map(([k, v]) => (
            <div key={k as string} className="card">
              <p className="text-muted text-xs">{k}</p>
              <p className="text-xl font-bold text-white mt-1">{fmt.compact(v as number)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 items-end">
        <div><label className="label">From</label><input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div><label className="label">To</label><input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
        <button className="btn-outline text-sm" onClick={() => refetch()}>Filter</button>
      </div>

      {isLoading ? <FullPageSpinner /> : (
        <div className="card p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Date','Description','Type','Debit','Credit','Balance'].map(h => (
                  <th key={h} className="text-left text-muted font-medium py-3 px-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(entries as any[]).map((e: any, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-bg-hover">
                  <td className="py-2.5 px-3 text-muted text-xs">{fmt.date(e.date ?? e.entryDate)}</td>
                  <td className="py-2.5 px-3 text-white">{e.description}</td>
                  <td className="py-2.5 px-3 text-muted">{e.type}</td>
                  <td className="py-2.5 px-3 text-bear">{e.debit ? fmt.price(e.debit) : '—'}</td>
                  <td className="py-2.5 px-3 text-bull">{e.credit ? fmt.price(e.credit) : '—'}</td>
                  <td className="py-2.5 px-3 text-white font-medium">{fmt.price(e.balance ?? e.runningBalance)}</td>
                </tr>
              ))}
              {entries.length === 0 && <tr><td colSpan={6} className="text-center text-muted py-8">No ledger entries</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
