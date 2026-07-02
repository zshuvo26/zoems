import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { holidayApi } from '../api'
import { fmt } from '../utils/formatters'
import { FullPageSpinner } from '../components/common/Spinner'

export default function HolidaysPage() {
  const [exchange, setExchange] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['holidays', exchange, year],
    queryFn: () => holidayApi.list(exchange || undefined, year),
  })

  if (isLoading) return <FullPageSpinner />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Holiday Calendar</h1>

      <div className="flex gap-3">
        <select className="input w-32" value={exchange} onChange={e => setExchange(e.target.value)}>
          <option value="">All</option><option value="DSE">DSE</option><option value="CSE">CSE</option>
        </select>
        <select className="input w-28" value={year} onChange={e => setYear(parseInt(e.target.value))}>
          {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {(holidays as any[]).map((h: any) => {
          const d = new Date(h.date)
          const isPast = d < new Date()
          return (
            <div key={h.id ?? h.date} className={`card flex items-center gap-4 ${isPast ? 'opacity-50' : ''}`}>
              <div className="text-center min-w-[48px]">
                <p className="text-muted text-xs">{d.toLocaleDateString('en-BD', { month: 'short' })}</p>
                <p className="text-2xl font-bold text-white">{d.getDate()}</p>
                <p className="text-muted text-xs">{d.toLocaleDateString('en-BD', { weekday: 'short' })}</p>
              </div>
              <div>
                <p className="text-white font-medium">{h.description}</p>
                <p className="text-muted text-xs mt-0.5">{h.exchange} · {d.getFullYear()}</p>
              </div>
            </div>
          )
        })}
        {holidays.length === 0 && <p className="text-muted">No holidays found</p>}
      </div>
    </div>
  )
}
