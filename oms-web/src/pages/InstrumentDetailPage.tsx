import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { marketApi } from '../api'
import { fmt, changeClass } from '../utils/formatters'
import { FullPageSpinner } from '../components/common/Spinner'
import Card from '../components/common/Card'

export default function InstrumentDetailPage() {
  const { symbol, exchange } = useParams<{ symbol: string; exchange: string }>()
  const nav = useNavigate()

  const { data: inst, isLoading } = useQuery({
    queryKey: ['instrument', symbol, exchange],
    queryFn: () => marketApi.instrument(symbol!, exchange!),
    refetchInterval: 5_000,
  })

  const { data: ob } = useQuery({
    queryKey: ['orderbook', symbol, exchange],
    queryFn: () => marketApi.orderBook(symbol!, exchange!),
    refetchInterval: 3_000,
  })

  const { data: trades = [] } = useQuery({
    queryKey: ['trades', symbol, exchange],
    queryFn: () => marketApi.trades(symbol!, exchange!),
    refetchInterval: 5_000,
  })

  if (isLoading) return <FullPageSpinner />
  if (!inst) return <div className="text-muted">Instrument not found</div>

  const change = (inst.lastPrice ?? 0) - (inst.previousClose ?? 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{inst.symbol}
            <span className="text-muted text-sm ml-2">{exchange}</span>
          </h1>
          <p className="text-muted text-sm">{inst.name}</p>
        </div>
        <button className="btn-primary" onClick={() => nav('/orders/new', { state: { symbol: inst.symbol, exchange } })}>
          New Order
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-muted text-xs">Last Price</p>
          <p className="text-2xl font-bold text-white mt-1">{fmt.price(inst.lastPrice)}</p>
          <p className={`text-sm font-medium mt-0.5 ${changeClass(change)}`}>
            {change >= 0 ? '+' : ''}{fmt.price(change)} ({fmt.pct(inst.changePercent)})
          </p>
        </div>
        <div className="card">
          <p className="text-muted text-xs">Open / Prev Close</p>
          <p className="text-white font-medium mt-1">{fmt.price(inst.openPrice)}</p>
          <p className="text-muted text-sm">{fmt.price(inst.previousClose)}</p>
        </div>
        <div className="card">
          <p className="text-muted text-xs">High / Low</p>
          <p className="text-bull font-medium mt-1">{fmt.price(inst.highPrice)}</p>
          <p className="text-bear text-sm">{fmt.price(inst.lowPrice)}</p>
        </div>
        <div className="card">
          <p className="text-muted text-xs">Volume / Turnover</p>
          <p className="text-white font-medium mt-1">{fmt.qty(inst.volume)}</p>
          <p className="text-muted text-sm">{fmt.compact(inst.turnover)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Order Book (L2)">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-bull text-xs font-bold mb-2">BID</p>
              {(ob?.bids ?? []).slice(0, 8).map((b: any, i: number) => (
                <div key={i} className="flex justify-between text-sm py-0.5">
                  <span className="text-bull">{fmt.price(b.price)}</span>
                  <span className="text-muted">{fmt.qty(b.quantity)}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-bear text-xs font-bold mb-2">ASK</p>
              {(ob?.asks ?? []).slice(0, 8).map((a: any, i: number) => (
                <div key={i} className="flex justify-between text-sm py-0.5">
                  <span className="text-bear">{fmt.price(a.price)}</span>
                  <span className="text-muted">{fmt.qty(a.quantity)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Recent Trades">
          <div className="space-y-1">
            {(trades as any[]).slice(0, 10).map((t: any, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <span className={t.side === 'BUY' ? 'text-bull' : 'text-bear'}>{fmt.price(t.price)}</span>
                <span className="text-muted">{fmt.qty(t.quantity)}</span>
                <span className="text-muted text-xs">{fmt.datetime(t.time)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {inst.isin && (
        <div className="card">
          <h3 className="font-semibold text-white mb-2">Instrument Info</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-muted text-xs">ISIN</p><p className="text-white">{inst.isin}</p></div>
            <div><p className="text-muted text-xs">Sector</p><p className="text-white">{inst.sector ?? '—'}</p></div>
            <div><p className="text-muted text-xs">Lot Size</p><p className="text-white">{inst.lotSize ?? '—'}</p></div>
            <div><p className="text-muted text-xs">Asset Class</p><p className="text-white">{inst.assetClass ?? 'EQUITY'}</p></div>
          </div>
        </div>
      )}
    </div>
  )
}
