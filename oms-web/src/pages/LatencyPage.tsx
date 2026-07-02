import { useQuery } from '@tanstack/react-query'
import { latencyApi } from '../api'
import { FullPageSpinner } from '../components/common/Spinner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function LatencyPage() {
  const { data: report = [], isLoading } = useQuery({
    queryKey: ['latency'],
    queryFn: () => latencyApi.report(),
    refetchInterval: 30_000,
  })

  const { data: live } = useQuery({
    queryKey: ['latency-live'],
    queryFn: () => latencyApi.live(),
    refetchInterval: 5_000,
  })

  if (isLoading) return <FullPageSpinner />

  const worstEndpoints = (report as any[]).sort((a, b) => b.p95Ms - a.p95Ms).slice(0, 5)

  const latencyColor = (ms: number) => {
    if (ms < 50) return '#00D09C'
    if (ms < 200) return '#FFB547'
    return '#FF6B6B'
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Latency Monitor</h1>

      {live && (
        <div className="grid grid-cols-3 gap-4">
          {[['Current Avg (ms)', (live as any).avgMs, latencyColor((live as any).avgMs)],
            ['P95 (ms)', (live as any).p95Ms, latencyColor((live as any).p95Ms)],
            ['Error Rate', `${((live as any).errorRate ?? 0).toFixed(2)}%`, (live as any).errorRate > 1 ? '#FF6B6B' : '#00D09C']].map(([k, v, c]) => (
            <div key={k as string} className="card">
              <p className="text-muted text-xs">{k}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: c as string }}>{v}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold text-white mb-3">P95 Latency by Endpoint</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={worstEndpoints} layout="vertical">
            <XAxis type="number" tick={{ fill: '#8B9CB6', fontSize: 11 }} />
            <YAxis type="category" dataKey="endpoint" width={200} tick={{ fill: '#8B9CB6', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#252A3D', border: '1px solid #2D3347', borderRadius: 8 }} formatter={(v: any) => [`${v}ms`]} />
            <Bar dataKey="p95Ms" radius={4}>
              {worstEndpoints.map((e: any, i: number) => (
                <Cell key={i} fill={latencyColor(e.p95Ms)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-0">
        <div className="p-4 border-b border-border"><h3 className="font-semibold text-white">All Endpoints</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Endpoint','Avg (ms)','P50 (ms)','P95 (ms)','P99 (ms)','Max (ms)','Requests','Errors'].map(h => (
                  <th key={h} className="text-left text-muted font-medium py-2.5 px-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(report as any[]).map((r: any, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-bg-hover">
                  <td className="py-2 px-3 text-white font-mono text-xs">{r.endpoint}</td>
                  <td className="py-2 px-3" style={{ color: latencyColor(r.avgLatencyMs) }}>{r.avgLatencyMs}</td>
                  <td className="py-2 px-3 text-muted">{r.p50Ms}</td>
                  <td className="py-2 px-3" style={{ color: latencyColor(r.p95Ms) }}>{r.p95Ms}</td>
                  <td className="py-2 px-3" style={{ color: latencyColor(r.p99Ms) }}>{r.p99Ms}</td>
                  <td className="py-2 px-3 text-bear">{r.maxMs}</td>
                  <td className="py-2 px-3 text-muted">{r.requestCount?.toLocaleString()}</td>
                  <td className="py-2 px-3 text-bear">{r.errorCount ?? 0}</td>
                </tr>
              ))}
              {report.length === 0 && <tr><td colSpan={8} className="text-center text-muted py-8">No latency data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
