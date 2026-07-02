import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { ordersApi, marketApi } from '../api'
import type { ExchangeType, OrderSide, OrderType, TimeInForce } from '../types/api'
import toast from 'react-hot-toast'
import { fmt } from '../utils/formatters'

const BD_FEES = { brokerage: 0.005, sec: 0.0005, cdbl: 0.00015, exchange: 0.00005 }

export default function NewOrderPage() {
  const nav = useNavigate()
  const { state } = useLocation() as { state?: { symbol?: string; exchange?: string } }
  const { accountId } = useAuthStore()
  const qc = useQueryClient()

  const [form, setForm] = useState({
    symbol: state?.symbol ?? '',
    exchange: (state?.exchange ?? 'DSE') as ExchangeType,
    side: 'BUY' as OrderSide,
    orderType: 'LIMIT' as OrderType,
    quantity: '',
    price: '',
    stopPrice: '',
    timeInForce: 'DAY' as TimeInForce,
    remarks: '',
    boid: '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const qty = parseFloat(form.quantity) || 0
  const price = parseFloat(form.price) || 0
  const gross = qty * price
  const commission = gross * BD_FEES.brokerage
  const fees = gross * (BD_FEES.sec + BD_FEES.cdbl + BD_FEES.exchange)
  const ait = form.side === 'SELL' ? gross * 0.001 : 0
  const stamp = form.side === 'BUY' ? gross * 0.00015 : 0
  const net = gross + commission + fees + ait + stamp

  const { data: smartRoute } = useQuery({
    queryKey: ['smartRoute', form.symbol, form.side, form.quantity],
    queryFn: () => ordersApi.smartRoute(form.symbol, form.side, qty),
    enabled: form.symbol.length >= 2 && qty > 0,
    staleTime: 10_000,
  })

  const submitMut = useMutation({
    mutationFn: () => ordersApi.submit({
      accountId: accountId!,
      symbol: form.symbol.toUpperCase(),
      exchange: form.exchange,
      side: form.side,
      orderType: form.orderType,
      quantity: qty,
      price: form.orderType !== 'MARKET' ? price : undefined,
      stopPrice: form.stopPrice ? parseFloat(form.stopPrice) : undefined,
      timeInForce: form.timeInForce,
      remarks: form.remarks,
      boid: form.boid,
    }),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      toast.success(`Order submitted: ${order.clientOrderId}`)
      nav('/orders')
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Order failed'),
  })

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">New Order</h1>
        <button className="btn-outline text-sm" onClick={() => nav(-1)}>Back</button>
      </div>

      <div className="card space-y-4">
        {/* BUY / SELL toggle */}
        <div className="flex gap-2">
          {(['BUY', 'SELL'] as OrderSide[]).map(s => (
            <button
              key={s}
              onClick={() => set('side', s)}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${
                form.side === s
                  ? s === 'BUY' ? 'bg-bull text-white' : 'bg-bear text-white'
                  : 'bg-bg-secondary border border-border text-muted'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Symbol</label>
            <input className="input uppercase" value={form.symbol} onChange={e => set('symbol', e.target.value)} placeholder="e.g. BRAC" />
          </div>
          <div>
            <label className="label">Exchange</label>
            <select className="input" value={form.exchange} onChange={e => set('exchange', e.target.value as ExchangeType)}>
              <option value="DSE">DSE</option>
              <option value="CSE">CSE</option>
            </select>
          </div>
          <div>
            <label className="label">Order Type</label>
            <select className="input" value={form.orderType} onChange={e => set('orderType', e.target.value as OrderType)}>
              <option value="MARKET">Market</option>
              <option value="LIMIT">Limit</option>
              <option value="STOP">Stop</option>
              <option value="STOP_LIMIT">Stop Limit</option>
            </select>
          </div>
          <div>
            <label className="label">Time in Force</label>
            <select className="input" value={form.timeInForce} onChange={e => set('timeInForce', e.target.value as TimeInForce)}>
              <option value="DAY">DAY</option>
              <option value="GTC">GTC</option>
              <option value="IOC">IOC</option>
              <option value="FOK">FOK</option>
            </select>
          </div>
          <div>
            <label className="label">Quantity</label>
            <input className="input" type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="Shares" />
          </div>
          {form.orderType !== 'MARKET' && (
            <div>
              <label className="label">Price (৳)</label>
              <input className="input" type="number" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" />
            </div>
          )}
          {['STOP','STOP_LIMIT'].includes(form.orderType) && (
            <div>
              <label className="label">Stop Price (৳)</label>
              <input className="input" type="number" step="0.01" value={form.stopPrice} onChange={e => set('stopPrice', e.target.value)} placeholder="0.00" />
            </div>
          )}
          <div>
            <label className="label">BOID (optional)</label>
            <input className="input" value={form.boid} onChange={e => set('boid', e.target.value)} placeholder="BO Account ID" />
          </div>
          <div className="col-span-2">
            <label className="label">Remarks</label>
            <input className="input" value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Optional remarks" />
          </div>
        </div>

        {/* Smart Router */}
        {smartRoute && (
          <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-lg p-3 text-sm">
            <p className="text-accent-blue font-medium mb-1">Smart Router Recommendation</p>
            <p className="text-white">Recommended: <span className="font-bold">{smartRoute.recommendedExchange}</span> · Expected: {fmt.price(smartRoute.expectedPrice)}</p>
            <p className="text-muted text-xs mt-1">{smartRoute.reasons?.join(' · ')}</p>
          </div>
        )}

        {/* Fee Summary */}
        {gross > 0 && (
          <div className="bg-bg-secondary rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted">Gross Amount</span><span className="text-white">{fmt.price(gross)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Brokerage (0.50%)</span><span className="text-white">{fmt.price(commission)}</span></div>
            <div className="flex justify-between"><span className="text-muted">SEC + CDBL + Exchange</span><span className="text-white">{fmt.price(fees)}</span></div>
            {ait > 0 && <div className="flex justify-between"><span className="text-muted">AIT (0.10%)</span><span className="text-white">{fmt.price(ait)}</span></div>}
            {stamp > 0 && <div className="flex justify-between"><span className="text-muted">Stamp (0.015%)</span><span className="text-white">{fmt.price(stamp)}</span></div>}
            <div className="flex justify-between border-t border-border pt-1 mt-1">
              <span className="text-white font-medium">Net {form.side === 'BUY' ? 'Payable' : 'Receivable'}</span>
              <span className="text-white font-bold">{fmt.price(net)}</span>
            </div>
          </div>
        )}

        <button
          className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${form.side === 'BUY' ? 'bg-bull hover:opacity-80' : 'bg-bear hover:opacity-80'}`}
          onClick={() => submitMut.mutate()}
          disabled={submitMut.isPending || !form.symbol || qty <= 0}
        >
          {submitMut.isPending ? 'Submitting…' : `${form.side} ${form.symbol || '—'}`}
        </button>
      </div>
    </div>
  )
}
