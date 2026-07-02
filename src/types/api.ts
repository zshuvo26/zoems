export type OrderSide = 'BUY' | 'SELL'
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT' | 'IOC' | 'FOK'
export type OrderStatus = 'PENDING' | 'OPEN' | 'PARTIAL' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'EXPIRED'
export type TimeInForce = 'DAY' | 'GTC' | 'IOC' | 'FOK' | 'GTD' | 'AT_OPEN' | 'AT_CLOSE'
export type ExchangeType = 'DSE' | 'CSE' | 'OTC' | 'DARK_POOL'
export type AssetClass = 'EQUITY' | 'BOND' | 'ETF' | 'MUTUAL_FUND' | 'T_BILL' | 'T_BOND' | 'SUKUK' | 'CORPORATE_BOND' | 'IPO' | 'RIGHTS'
export type SettlementType = 'T0' | 'T1' | 'T2' | 'T3' | 'DVP' | 'FOP'
export type AlgoType = 'TWAP' | 'VWAP' | 'POV' | 'ICEBERG' | 'SNIPER' | 'STEALTH' | 'ARRIVAL_PRICE' | 'LIQUIDITY_SEEKING'

export interface Order {
  id: string
  clientOrderId: string
  accountId: string
  boid?: string
  symbol: string
  isin?: string
  exchange: ExchangeType
  assetClass?: AssetClass
  side: OrderSide
  orderType: OrderType
  quantity: number
  executedQuantity: number
  price?: number
  stopPrice?: number
  avgFillPrice?: number
  status: OrderStatus
  timeInForce: TimeInForce
  settlementType?: SettlementType
  dealerId?: string
  dealerName?: string
  remarks?: string
  source?: string
  parentOrderId?: string
  createdAt: string
  updatedAt: string
  filledAt?: string
  commission?: number
  netAmount?: number
  fees?: Record<string, number>
}

export interface OrderRequest {
  accountId: string
  boid?: string
  symbol: string
  isin?: string
  exchange: ExchangeType
  assetClass?: AssetClass
  side: OrderSide
  orderType: OrderType
  quantity: number
  price?: number
  stopPrice?: number
  timeInForce: TimeInForce
  settlementType?: SettlementType
  dealerId?: string
  remarks?: string
}

export interface Account {
  id: string
  accountNumber: string
  clientName: string
  clientCode?: string
  boid?: string
  dealerId?: string
  cashBalance: number
  buyingPower: number
  marginUsed: number
  email?: string
  phone?: string
  status: string
  createdAt: string
}

export interface Instrument {
  id: string
  symbol: string
  name: string
  exchange: ExchangeType
  assetClass?: AssetClass
  isin?: string
  lastPrice: number
  previousClose?: number
  openPrice?: number
  highPrice?: number
  lowPrice?: number
  volume?: number
  turnover?: number
  changePercent?: number
  circuit?: string
  sector?: string
  lotSize?: number
}

export interface Portfolio {
  accountId: string
  totalValue: number
  cashBalance: number
  investedValue: number
  unrealizedPnl: number
  realizedPnl: number
  todayPnl: number
  dayChangePercent: number
  positions: Position[]
}

export interface Position {
  symbol: string
  exchange: ExchangeType
  quantity: number
  avgCost: number
  lastPrice: number
  marketValue: number
  unrealizedPnl: number
  unrealizedPnlPct: number
}

export interface AlgoOrder {
  id: string
  accountId: string
  symbol: string
  exchange: ExchangeType
  side: OrderSide
  algoType: AlgoType
  totalQuantity: number
  executedQuantity: number
  remainingQuantity: number
  priceLimit?: number
  startTime?: string
  endTime?: string
  participationRate?: number
  status: string
  createdAt: string
  childOrders?: Order[]
}

export interface ParentOrder {
  id: string
  accountId: string
  boid?: string
  dealerId?: string
  symbol: string
  isin?: string
  exchange: ExchangeType
  side: OrderSide
  totalQuantity: number
  executedQuantity: number
  remainingQuantity: number
  priceLimit?: number
  numSlices: number
  completedSlices: number
  status: string
  notes?: string
  createdAt: string
  children?: Order[]
}

export interface BasketOrder {
  accountId: string
  basketName: string
  items: BasketItem[]
}

export interface BasketItem {
  symbol: string
  exchange: ExchangeType
  side: OrderSide
  quantity: number
  orderType: OrderType
  price?: number
}

export interface SavedBasket {
  id: string
  accountId: string
  basketName: string
  items: BasketItem[]
  createdAt: string
}

export interface WatchlistItem {
  id: string
  accountId: string
  symbol: string
  exchange: ExchangeType
  addedAt: string
  lastPrice?: number
  changePercent?: number
}

export interface PriceAlert {
  id: string
  accountId: string
  symbol: string
  exchange: string
  condition: 'ABOVE' | 'BELOW' | 'PCT_UP' | 'PCT_DOWN'
  targetPrice?: number
  percentThreshold?: number
  active: boolean
  triggered: boolean
  triggeredAt?: string
  createdAt: string
}

export interface Notification {
  id: string
  accountId: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

export interface IpoApplication {
  id: string
  accountId: string
  symbol: string
  companyName: string
  issuePrice: number
  appliedQuantity: number
  allottedQuantity?: number
  totalAmount: number
  status: string
  appliedAt: string
}

export interface Settlement {
  id: string
  accountId: string
  tradeDate: string
  settlementDate: string
  symbol: string
  side: OrderSide
  quantity: number
  price: number
  grossAmount: number
  commission: number
  netAmount: number
  status: string
}

export interface MarginInfo {
  accountId: string
  marginLimit: number
  marginUsed: number
  marginAvailable: number
  marginRatio: number
  exposures: MarginExposure[]
}

export interface MarginExposure {
  symbol: string
  quantity: number
  currentValue: number
  haircut: number
  marginRequired: number
}

export interface CorporateAction {
  id: string
  symbol: string
  exchange: ExchangeType
  actionType: string
  exDate: string
  recordDate?: string
  paymentDate?: string
  details: Record<string, string>
}

export interface HolidayCalendar {
  id: string
  date: string
  exchange: ExchangeType
  description: string
}

export interface LatencyReport {
  endpoint: string
  avgLatencyMs: number
  p50Ms: number
  p95Ms: number
  p99Ms: number
  maxMs: number
  requestCount: number
  errorCount: number
  period: string
}

export interface OrderAudit {
  id: string
  orderId: string
  action: string
  previousStatus?: string
  newStatus?: string
  userId?: string
  details?: string
  timestamp: string
}

export interface OrderTemplate {
  id: string
  accountId: string
  templateName: string
  symbol: string
  exchange: ExchangeType
  side: OrderSide
  orderType: OrderType
  quantity: number
  price?: number
  timeInForce: TimeInForce
  createdAt: string
}

export interface TcaReport {
  orderId: string
  symbol: string
  side: OrderSide
  quantity: number
  arrivalPrice: number
  vwap: number
  implementationShortfall: number
  marketImpact: number
  timingCost: number
  commissionCost: number
}

export interface SmartRouterResponse {
  symbol: string
  recommendedExchange: ExchangeType
  expectedPrice: number
  expectedFillRate: number
  latencyMs: number
  reasons: string[]
}

export interface PagedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export interface ApiError {
  code: string
  message: string
  timestamp: string
}
