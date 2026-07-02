import { useState } from 'react'
import { fmt } from '../utils/formatters'

const BD_FEES = { brokerage: 0.005, sec: 0.0005, cdbl: 0.00015, exchange: 0.00005 }

interface Result {
  buyGross: number; buyCost: number; buyTotal: number
  sellGross: number; sellNet: number
  grossProfit: number; netProfit: number; profitPct: number
}

export default function ProfitCalcPage() {
  const [buyPrice, setBuyPrice] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [result, setResult] = useState<Result | null>(null)

  const calculate = () => {
    const bp = parseFloat(buyPrice)
    const sp = parseFloat(sellPrice)
    const qty = parseFloat(quantity)
    if (!bp || !sp || !qty) return

    const buyGross = bp * qty
    const buyCom = buyGross * BD_FEES.brokerage
    const buyFees = buyGross * (BD_FEES.sec + BD_FEES.cdbl + BD_FEES.exchange)
    const buyStamp = buyGross * 0.00015
    const buyTotal = buyGross + buyCom + buyFees + buyStamp

    const sellGross = sp * qty
    const sellCom = sellGross * BD_FEES.brokerage
    const sellFees = sellGross * (BD_FEES.sec + BD_FEES.cdbl + BD_FEES.exchange)
    const sellAit = sellGross * 0.001
    const sellNet = sellGross - sellCom - sellFees - sellAit

    const grossProfit = sellGross - buyGross
    const netProfit = sellNet - buyTotal
    const profitPct = (netProfit / buyTotal) * 100

    setResult({ buyGross, buyCost: buyCom + buyFees + buyStamp, buyTotal, sellGross, sellNet, grossProfit, netProfit, profitPct })
  }

  const color = (v: number) => v >= 0 ? 'text-bull' : 'text-bear'

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-bold text-white">Profit Calculator</h1>
      <p className="text-muted text-sm">Bangladesh DSE/CSE fee structure: Brokerage 0.50%, SEC 0.05%, CDBL 0.015%, AIT 0.10% (sell), Stamp 0.015% (buy)</p>

      <div className="card space-y-3">
        <div><label className="label">Quantity (shares)</label><input className="input" type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g. 1000" /></div>
        <div><label className="label">Buy Price (৳)</label><input className="input" type="number" step="0.01" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} placeholder="0.00" /></div>
        <div><label className="label">Sell Price (৳)</label><input className="input" type="number" step="0.01" value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="0.00" /></div>
        <button className="btn-primary w-full" onClick={calculate}>Calculate</button>
      </div>

      {result && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-white">Result</h3>

          <div className="space-y-1 text-sm">
            <p className="text-muted text-xs font-medium uppercase mt-2">Buy Side</p>
            <div className="flex justify-between"><span className="text-muted">Gross Cost</span><span className="text-white">{fmt.price(result.buyGross)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Fees & Commission</span><span className="text-bear">{fmt.price(result.buyCost)}</span></div>
            <div className="flex justify-between font-medium"><span className="text-muted">Total Paid</span><span className="text-white">{fmt.price(result.buyTotal)}</span></div>

            <p className="text-muted text-xs font-medium uppercase mt-3">Sell Side</p>
            <div className="flex justify-between"><span className="text-muted">Gross Proceeds</span><span className="text-white">{fmt.price(result.sellGross)}</span></div>
            <div className="flex justify-between font-medium"><span className="text-muted">Net Received</span><span className="text-white">{fmt.price(result.sellNet)}</span></div>

            <div className="border-t border-border pt-3 mt-2">
              <div className="flex justify-between"><span className="text-muted">Gross Profit</span><span className={color(result.grossProfit)}>{fmt.price(result.grossProfit)}</span></div>
              <div className="flex justify-between text-lg font-bold mt-1">
                <span className="text-white">Net Profit</span>
                <span className={color(result.netProfit)}>{fmt.price(result.netProfit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Return</span>
                <span className={`font-bold ${color(result.profitPct)}`}>{fmt.pct(result.profitPct)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
