import { useState } from 'react'
import { useAuthStore } from '../store/auth'
import { BASE_URL } from '../api/client'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import { accountsApi } from '../api'

export default function SettingsPage() {
  const { accountId, username, role } = useAuthStore()
  const [serverUrl, setServerUrl] = useState(BASE_URL)

  const { data: account } = useQuery({
    queryKey: ['account', accountId],
    queryFn: () => accountsApi.get(accountId!),
    enabled: !!accountId,
  })

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-white">Settings</h1>

      <div className="card space-y-4">
        <h3 className="font-semibold text-white">Profile</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[['Username', username], ['Account ID', accountId], ['Role', role],
            ['Client Name', (account as any)?.clientName], ['BOID', (account as any)?.boid ?? '—'],
            ['Client Code', (account as any)?.clientCode ?? '—']].map(([k, v]) => (
            <div key={k as string}>
              <p className="text-muted text-xs">{k}</p>
              <p className="text-white">{v ?? '—'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold text-white">Connection</h3>
        <div>
          <label className="label">Backend URL</label>
          <div className="flex gap-2">
            <input className="input flex-1" value={serverUrl} onChange={e => setServerUrl(e.target.value)} />
            <button className="btn-primary text-sm" onClick={() => toast.success('Restart app to apply')}>Save</button>
          </div>
          <p className="text-muted text-xs mt-1">Current: {BASE_URL}</p>
        </div>
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold text-white">About</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[['System', 'ZOEMS Bangladesh OMS/EMS'], ['Protocol', 'FIX 4.4'], ['Backend', 'Spring Boot 3.2'], ['Exchange', 'DSE / CSE'], ['Settlement', 'T+2'], ['Version', '1.0.0']].map(([k,v]) => (
            <div key={k}>
              <p className="text-muted text-xs">{k}</p>
              <p className="text-white">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
