import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { marginApi } from '../api'
import { fmt } from '../utils/formatters'
import { FullPageSpinner } from '../components/common/Spinner'

export default function MarginPage() {
  const { accountId } = useAuthStore()

  const { data: margin, isLoading } = useQuery({
    queryKey: ['margin', accountId],
    queryFn: () => marginApi.info(accountId!),
    enabled: !!accountId,
    refetchInterval: 30_000,
  })

  const { data: limits } = useQuery({
    queryKey: ['margin-limits', accountId],
    queryFn: () => marginApi.limits(accountId!),
    enabled: !!accountId,
  })

  if (isLoading) return <FullPageSpinner />

  const utilization = margin ? (margin.marginUsed / margin.marginLimit) * 100 : 0

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Margin & Risk</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card"><p className="text-muted text-xs">Margin Limit</p><p className="text-xl font-bold text-white mt-1">{fmt.compact(margin?.marginLimit)}</p></div>
        <div className="card"><p className="text-muted text-xs">Margin Used</p><p className="text-xl font-bold text-amber mt-1">{fmt.compact(margin?.marginUsed)}</p></div>
        <div className="card"><p className="text-muted text-xs">Available</p><p className="text-xl font-bold text-bull mt-1">{fmt.compact(margin?.marginAvailable)}</p></div>
        <div className="card"><p className="text-muted text-xs">Utilization</p>
          <p className={`text-xl font-bold mt-1 ${utilization > 80 ? 'text-bear' : utilization > 50 ? 'text-amber' : 'text-bull'}`}>{utilization.toFixed(1)}%</p>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-white mb-3">Margin Utilization</h3>
        <div className="w-full bg-bg-secondary rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${utilization > 80 ? 'bg-bear' : utilization > 50 ? 'bg-amber' : 'bg-bull'}`}
            style={{ width: `${Math.min(utilization, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted mt-1">
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </div>

      {margin?.exposures && margin.exposures.length > 0 && (
        <div className="card p-0">
          <div className="p-4 border-b border-border"><h3 className="font-semibold text-white">Position Exposure</h3></div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Symbol','Quantity','Current Value','Haircut','Margin Required'].map(h => (
                  <th key={h} className="text-left text-muted font-medium py-2.5 px-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {margin.exposures.map((e, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-bg-hover">
                  <td className="py-2 px-3 text-white font-medium">{e.symbol}</td>
                  <td className="py-2 px-3">{fmt.qty(e.quantity)}</td>
                  <td className="py-2 px-3">{fmt.compact(e.currentValue)}</td>
                  <td className="py-2 px-3">{e.haircut}%</td>
                  <td className="py-2 px-3 text-amber font-medium">{fmt.compact(e.marginRequired)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {limits && (
        <div className="card">
          <h3 className="font-semibold text-white mb-3">Risk Limits</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {Object.entries(limits as Record<string, unknown>).map(([k, v]) => (
              <div key={k} className="bg-bg-secondary rounded-lg p-3">
                <p className="text-muted text-xs capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</p>
                <p className="text-white font-medium mt-1">{typeof v === 'number' ? fmt.compact(v) : String(v)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
