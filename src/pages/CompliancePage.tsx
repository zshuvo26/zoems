import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { complianceApi } from '../api'
import { fmt } from '../utils/formatters'
import { FullPageSpinner } from '../components/common/Spinner'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

export default function CompliancePage() {
  const { accountId } = useAuthStore()

  const { data: rules = [], isLoading: rulesLoad } = useQuery({
    queryKey: ['compliance-rules'],
    queryFn: () => complianceApi.rules(),
  })

  const { data: check } = useQuery({
    queryKey: ['compliance-check', accountId],
    queryFn: () => complianceApi.check(accountId!),
    enabled: !!accountId,
    refetchInterval: 60_000,
  })

  const { data: breaches = [], isLoading: breachLoad } = useQuery({
    queryKey: ['compliance-breaches', accountId],
    queryFn: () => complianceApi.breaches(accountId!),
    enabled: !!accountId,
  })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Compliance Rules</h1>

      {check && (
        <div className={`card border ${(check as any).compliant ? 'border-bull/40 bg-bull/5' : 'border-bear/40 bg-bear/5'}`}>
          <div className="flex items-center gap-3">
            {(check as any).compliant
              ? <CheckCircle size={20} className="text-bull" />
              : <XCircle size={20} className="text-bear" />}
            <div>
              <p className="text-white font-medium">{(check as any).compliant ? 'All compliance checks passed' : 'Compliance violations detected'}</p>
              <p className="text-muted text-sm">{(check as any).message}</p>
            </div>
          </div>
        </div>
      )}

      {(breaches as any[]).length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-bear" /> Active Breaches
          </h3>
          <div className="space-y-2">
            {(breaches as any[]).map((b: any, i) => (
              <div key={i} className="bg-bear/10 border border-bear/30 rounded-lg p-3 text-sm">
                <p className="text-bear font-medium">{b.rule}</p>
                <p className="text-muted mt-0.5">{b.description}</p>
                {b.detectedAt && <p className="text-muted text-xs mt-1">{fmt.datetime(b.detectedAt)}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {rulesLoad ? <FullPageSpinner /> : (
        <div className="card">
          <h3 className="font-semibold text-white mb-3">Compliance Rules</h3>
          <div className="space-y-2">
            {(rules as any[]).map((r: any, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-bg-secondary rounded-lg">
                <CheckCircle size={16} className="text-bull flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-medium">{r.name}</p>
                  <p className="text-muted text-xs mt-0.5">{r.description}</p>
                </div>
              </div>
            ))}
            {rules.length === 0 && <p className="text-muted">No compliance rules configured</p>}
          </div>
        </div>
      )}
    </div>
  )
}
