import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi } from '../api'
import { fmt } from '../utils/formatters'
import { FullPageSpinner } from '../components/common/Spinner'
import StatusBadge from '../components/common/StatusBadge'
import Card from '../components/common/Card'
import toast from 'react-hot-toast'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const qc = useQueryClient()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id!),
    refetchInterval: 5_000,
  })

  const { data: audit = [] } = useQuery({
    queryKey: ['audit', id],
    queryFn: () => ordersApi.audit(id!),
  })

  const cancelMut = useMutation({
    mutationFn: () => ordersApi.cancel(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['order', id] }); toast.success('Order cancelled') },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Cancel failed'),
  })

  const cloneMut = useMutation({
    mutationFn: () => ordersApi.clone(id!),
    onSuccess: (o) => { toast.success('Order cloned'); nav(`/orders/${o.id}`) },
  })

  if (isLoading) return <FullPageSpinner />
  if (!order) return <div className="text-muted">Order not found</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">{order.symbol}</h1>
            <span className={`text-sm font-bold px-2 py-0.5 rounded ${order.side === 'BUY' ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'}`}>{order.side}</span>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-muted text-xs mt-1">{order.clientOrderId}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline text-sm" onClick={() => cloneMut.mutate()}>Clone</button>
          {['PENDING','OPEN'].includes(order.status) && (
            <button className="btn-danger text-sm" onClick={() => cancelMut.mutate()}>Cancel</button>
          )}
          <button className="btn-outline text-sm" onClick={() => nav(-1)}>Back</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Order Details">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Symbol', order.symbol],
              ['Exchange', order.exchange],
              ['Type', order.orderType],
              ['TIF', order.timeInForce],
              ['Quantity', fmt.qty(order.quantity)],
              ['Filled', fmt.qty(order.executedQuantity)],
              ['Remaining', fmt.qty(order.quantity - order.executedQuantity)],
              ['Price', order.price != null ? fmt.price(order.price) : 'MARKET'],
              ['Avg Fill', fmt.price(order.avgFillPrice)],
              ['Stop Price', order.stopPrice != null ? fmt.price(order.stopPrice) : '—'],
              ['Asset Class', order.assetClass ?? '—'],
              ['Settlement', order.settlementType ?? 'T2'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-muted text-xs">{k}</p>
                <p className="text-white">{v}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Counterparty & Fees">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Account ID', order.accountId],
              ['BOID', order.boid ?? '—'],
              ['Dealer', order.dealerName ?? order.dealerId ?? '—'],
              ['Source', order.source ?? '—'],
              ['Commission', fmt.price(order.commission)],
              ['Net Amount', fmt.price(order.netAmount)],
              ['Created', fmt.datetime(order.createdAt)],
              ['Updated', fmt.datetime(order.updatedAt)],
              ['Filled At', order.filledAt ? fmt.datetime(order.filledAt) : '—'],
              ['Remarks', order.remarks ?? '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-muted text-xs">{k}</p>
                <p className="text-white">{v}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Audit Trail">
        {(audit as any[]).length === 0 ? (
          <p className="text-muted text-sm">No audit records</p>
        ) : (
          <div className="space-y-2">
            {(audit as any[]).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between p-2 bg-bg-secondary rounded-lg text-sm">
                <div>
                  <span className="text-white font-medium">{a.action}</span>
                  {a.previousStatus && <span className="text-muted ml-2">{a.previousStatus} → {a.newStatus}</span>}
                  {a.details && <p className="text-muted text-xs mt-0.5">{a.details}</p>}
                </div>
                <span className="text-muted text-xs">{fmt.datetime(a.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
