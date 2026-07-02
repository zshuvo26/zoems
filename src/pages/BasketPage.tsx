import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { basketApi } from '../api'
import { fmt } from '../utils/formatters'
import { FullPageSpinner } from '../components/common/Spinner'
import type { ExchangeType, OrderSide, OrderType } from '../types/api'
import toast from 'react-hot-toast'
import { Plus, Trash2, Send, Save } from 'lucide-react'

interface Item { symbol: string; exchange: ExchangeType; side: OrderSide; quantity: string; orderType: OrderType; price: string }
const blank = (): Item => ({ symbol: '', exchange: 'DSE', side: 'BUY', quantity: '', orderType: 'LIMIT', price: '' })

export default function BasketPage() {
  const { accountId } = useAuthStore()
  const qc = useQueryClient()
  const [items, setItems] = useState<Item[]>([blank()])
  const [basketName, setBasketName] = useState('Basket ' + new Date().toLocaleDateString())
  const [tab, setTab] = useState<'new'|'saved'>('new')

  const { data: saved = [], isLoading } = useQuery({
    queryKey: ['saved-baskets', accountId],
    queryFn: () => basketApi.saved(accountId!),
    enabled: !!accountId && tab === 'saved',
  })

  const submitMut = useMutation({
    mutationFn: () => basketApi.submit({
      accountId: accountId!,
      basketName,
      items: items.filter(i => i.symbol).map(i => ({
        symbol: i.symbol.toUpperCase(),
        exchange: i.exchange,
        side: i.side,
        quantity: parseFloat(i.quantity),
        orderType: i.orderType,
        price: i.price ? parseFloat(i.price) : undefined,
      })),
    }),
    onSuccess: () => { toast.success('Basket submitted'); qc.invalidateQueries({ queryKey: ['orders'] }) },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  const saveMut = useMutation({
    mutationFn: () => basketApi.save({
      accountId: accountId!,
      basketName,
      items: items.filter(i => i.symbol).map(i => ({
        symbol: i.symbol.toUpperCase(), exchange: i.exchange, side: i.side,
        quantity: parseFloat(i.quantity), orderType: i.orderType,
        price: i.price ? parseFloat(i.price) : undefined,
      })),
    }),
    onSuccess: () => { toast.success('Basket saved'); qc.invalidateQueries({ queryKey: ['saved-baskets'] }) },
  })

  const executeSavedMut = useMutation({
    mutationFn: (id: string) => basketApi.executeSaved(id, accountId!),
    onSuccess: () => toast.success('Basket executed'),
  })

  const deleteSavedMut = useMutation({
    mutationFn: (id: string) => basketApi.deleteSaved(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-baskets'] }),
  })

  const updateItem = (i: number, k: keyof Item, v: string) =>
    setItems(items.map((item, idx) => idx === i ? { ...item, [k]: v } : item))

  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Basket Orders</h1>

      <div className="flex gap-2 border-b border-border pb-2">
        {(['new','saved'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-t-lg text-sm font-medium transition-colors ${tab === t ? 'bg-bg-card text-white border-t border-x border-border' : 'text-muted hover:text-white'}`}>
            {t === 'new' ? 'New Basket' : 'Saved Baskets'}
          </button>
        ))}
      </div>

      {tab === 'new' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div>
              <label className="label">Basket Name</label>
              <input className="input w-64" value={basketName} onChange={e => setBasketName(e.target.value)} />
            </div>
          </div>

          <div className="card space-y-3">
            <div className="grid grid-cols-6 gap-2 text-xs text-muted font-medium pb-1 border-b border-border">
              <span>Symbol</span><span>Exchange</span><span>Side</span><span>Qty</span><span>Type / Price</span><span></span>
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-6 gap-2 items-end">
                <input className="input text-sm uppercase" placeholder="BRAC" value={item.symbol} onChange={e => updateItem(i,'symbol',e.target.value)} />
                <select className="input text-sm" value={item.exchange} onChange={e => updateItem(i,'exchange',e.target.value as ExchangeType)}>
                  <option>DSE</option><option>CSE</option>
                </select>
                <select className="input text-sm" value={item.side} onChange={e => updateItem(i,'side',e.target.value as OrderSide)}>
                  <option>BUY</option><option>SELL</option>
                </select>
                <input className="input text-sm" type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i,'quantity',e.target.value)} />
                <div className="flex gap-1">
                  <select className="input text-sm flex-1" value={item.orderType} onChange={e => updateItem(i,'orderType',e.target.value as OrderType)}>
                    <option value="LIMIT">LMT</option><option value="MARKET">MKT</option>
                  </select>
                  {item.orderType === 'LIMIT' && (
                    <input className="input text-sm w-20" type="number" step="0.01" placeholder="Price" value={item.price} onChange={e => updateItem(i,'price',e.target.value)} />
                  )}
                </div>
                <button className="text-bear hover:opacity-80 flex justify-center" onClick={() => removeItem(i)}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <button className="btn-outline flex items-center gap-1 text-sm w-fit" onClick={() => setItems([...items, blank()])}>
              <Plus size={13} /> Add Row
            </button>
          </div>

          <div className="flex gap-2">
            <button className="btn-outline flex items-center gap-1 text-sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              <Save size={14} /> Save
            </button>
            <button className="btn-primary flex items-center gap-1 text-sm" onClick={() => submitMut.mutate()} disabled={submitMut.isPending}>
              <Send size={14} /> {submitMut.isPending ? 'Submitting…' : 'Submit Basket'}
            </button>
          </div>
        </div>
      )}

      {tab === 'saved' && (
        isLoading ? <FullPageSpinner /> : (
          <div className="space-y-3">
            {(saved as any[]).length === 0 && <p className="text-muted">No saved baskets</p>}
            {(saved as any[]).map((b: any) => (
              <div key={b.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white">{b.basketName}</h3>
                    <p className="text-muted text-xs">{b.items?.length ?? 0} items · {fmt.datetime(b.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-primary text-sm" onClick={() => executeSavedMut.mutate(b.id)}>Execute</button>
                    <button className="btn-outline text-sm text-bear" onClick={() => deleteSavedMut.mutate(b.id)}>Delete</button>
                  </div>
                </div>
                <div className="space-y-1">
                  {(b.items ?? []).map((item: any, i: number) => (
                    <div key={i} className="flex gap-4 text-sm text-muted">
                      <span className={`font-bold ${item.side === 'BUY' ? 'text-bull' : 'text-bear'}`}>{item.side}</span>
                      <span className="text-white">{item.symbol}</span>
                      <span>{item.exchange}</span>
                      <span>{fmt.qty(item.quantity)}</span>
                      {item.price && <span>@ {fmt.price(item.price)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
