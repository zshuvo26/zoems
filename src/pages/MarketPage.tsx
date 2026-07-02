import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { marketApi } from '../api'
import { FullPageSpinner } from '../components/common/Spinner'
import { fmt, changeClass } from '../utils/formatters'
import type { Instrument } from '../types/api'

const EXCHANGES = ['DSE', 'CSE']

export default function MarketPage() {
  const nav = useNavigate()
  const [exchange, setExchange] = useState('DSE')
  const [search, setSearch] = useState('')

  const { data: instruments = [], isLoading } = useQuery({
    queryKey: ['instruments', exchange],
    queryFn: () => marketApi.instruments(exchange),
    refetchInterval: 15_000,
  })

  const filtered = instruments.filter((i: Instrument) =>
    i.symbol.includes(search.toUpperCase()) || i.name?.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) return <FullPageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Market</h1>
        <div className="flex gap-2">
          <button className="btn-outline text-sm" onClick={() => nav('/market/circuit-breakers')}>Circuit Breakers</button>
          <button className="btn-outline text-sm" onClick={() => nav('/market/foreign-flow')}>Foreign Flow</button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex bg-bg-card rounded-lg border border-border p-1 gap-1">
          {EXCHANGES.map(ex => (
            <button
              key={ex}
              onClick={() => setExchange(ex)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${exchange === ex ? 'bg-accent-blue text-white' : 'text-muted hover:text-white'}`}
            >
              {ex}
            </button>
          ))}
        </div>
        <input
          className="input max-w-xs"
          placeholder="Search symbol or company…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Symbol','Company','Last Price','Change','%Change','Open','High','Low','Volume','Turnover'].map(h => (
                  <th key={h} className="text-left text-muted font-medium py-3 px-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inst: Instrument) => (
                <tr
                  key={inst.id}
                  className="border-b border-border/50 hover:bg-bg-hover cursor-pointer transition-colors"
                  onClick={() => nav(`/market/${exchange}/${inst.symbol}`)}
                >
                  <td className="py-2.5 px-3 text-accent-blue font-semibold">{inst.symbol}</td>
                  <td className="py-2.5 px-3 text-muted max-w-[160px] truncate">{inst.name}</td>
                  <td className="py-2.5 px-3 text-white font-medium">{fmt.price(inst.lastPrice)}</td>
                  <td className={`py-2.5 px-3 font-medium ${changeClass((inst.lastPrice ?? 0) - (inst.previousClose ?? 0))}`}>
                    {inst.previousClose != null ? fmt.price(inst.lastPrice - inst.previousClose) : '—'}
                  </td>
                  <td className={`py-2.5 px-3 font-medium ${changeClass(inst.changePercent)}`}>{fmt.pct(inst.changePercent)}</td>
                  <td className="py-2.5 px-3 text-muted">{fmt.price(inst.openPrice)}</td>
                  <td className="py-2.5 px-3 text-muted">{fmt.price(inst.highPrice)}</td>
                  <td className="py-2.5 px-3 text-muted">{fmt.price(inst.lowPrice)}</td>
                  <td className="py-2.5 px-3 text-muted">{fmt.qty(inst.volume)}</td>
                  <td className="py-2.5 px-3 text-muted">{fmt.compact(inst.turnover)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center text-muted py-10">No instruments found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
