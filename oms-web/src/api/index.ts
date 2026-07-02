import client from './client'
import type {
  Order, OrderRequest, Account, Instrument, Portfolio, AlgoOrder,
  ParentOrder, BasketOrder, SavedBasket, WatchlistItem, PriceAlert,
  Notification, IpoApplication, Settlement, MarginInfo, CorporateAction,
  HolidayCalendar, LatencyReport, OrderTemplate, TcaReport, SmartRouterResponse
} from '../types/api'

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    client.post('/api/auth/login', { username, password }).then(r => r.data),
}

// Orders
export const ordersApi = {
  list: (accountId: string) =>
    client.get<Order[]>(`/api/orders?accountId=${accountId}`).then(r => r.data),
  get: (id: string) =>
    client.get<Order>(`/api/orders/${id}`).then(r => r.data),
  submit: (req: OrderRequest) =>
    client.post<Order>('/api/orders', req).then(r => r.data),
  cancel: (id: string) =>
    client.delete<Order>(`/api/orders/${id}`).then(r => r.data),
  modify: (id: string, price: number, quantity: number) =>
    client.put<Order>(`/api/orders/${id}`, { price, quantity }).then(r => r.data),
  clone: (id: string) =>
    client.post<Order>(`/api/orders/${id}/clone`).then(r => r.data),
  audit: (id: string) =>
    client.get(`/api/orders/${id}/audit`).then(r => r.data),
  search: (params: Record<string, string | undefined>) =>
    client.get<Order[]>('/api/orders/search', { params }).then(r => r.data),
  bulkCancel: (orderIds: string[]) =>
    client.post('/api/orders/bulk-cancel', { orderIds }).then(r => r.data),
  fees: (symbol: string, exchange: string, side: string, quantity: number, price: number) =>
    client.get('/api/orders/fees', { params: { symbol, exchange, side, quantity, price } }).then(r => r.data),
  smartRoute: (symbol: string, side: string, quantity: number) =>
    client.get<SmartRouterResponse>('/api/smart-router/route', { params: { symbol, side, quantity } }).then(r => r.data),
}

// Accounts
export const accountsApi = {
  list: () => client.get<Account[]>('/api/accounts').then(r => r.data),
  get: (id: string) => client.get<Account>(`/api/accounts/${id}`).then(r => r.data),
  create: (data: Partial<Account>) => client.post<Account>('/api/accounts', data).then(r => r.data),
  update: (id: string, data: Partial<Account>) => client.put<Account>(`/api/accounts/${id}`, data).then(r => r.data),
}

// Market / Instruments
export const marketApi = {
  instruments: (exchange?: string) =>
    client.get<Instrument[]>('/api/instruments', { params: { exchange } }).then(r => r.data),
  instrument: (symbol: string, exchange: string) =>
    client.get<Instrument>(`/api/instruments/${symbol}/${exchange}`).then(r => r.data),
  orderBook: (symbol: string, exchange: string) =>
    client.get(`/api/market-data/order-book/${symbol}/${exchange}`).then(r => r.data),
  trades: (symbol: string, exchange: string) =>
    client.get(`/api/market-data/trades/${symbol}/${exchange}`).then(r => r.data),
  movers: (exchange: string) =>
    client.get(`/api/market-data/movers/${exchange}`).then(r => r.data),
  foreignFlow: () =>
    client.get('/api/market-data/foreign-flow').then(r => r.data),
  circuitBreakers: () =>
    client.get('/api/circuit-breaker/status').then(r => r.data),
  sectorHeatmap: (exchange: string) =>
    client.get(`/api/market-data/sector-heatmap/${exchange}`).then(r => r.data),
}

// Portfolio
export const portfolioApi = {
  summary: (accountId: string) =>
    client.get<Portfolio>(`/api/portfolio/${accountId}`).then(r => r.data),
  performance: (accountId: string, period: string) =>
    client.get(`/api/portfolio/${accountId}/performance`, { params: { period } }).then(r => r.data),
  rebalance: (accountId: string) =>
    client.get(`/api/portfolio/${accountId}/rebalance`).then(r => r.data),
  tca: (accountId: string, from: string, to: string) =>
    client.get<TcaReport[]>(`/api/portfolio/tca`, { params: { accountId, from, to } }).then(r => r.data),
}

// Algo Orders
export const algoApi = {
  list: (accountId: string) =>
    client.get<AlgoOrder[]>(`/api/algo/orders?accountId=${accountId}`).then(r => r.data),
  submit: (req: object) =>
    client.post<AlgoOrder>('/api/algo/orders', req).then(r => r.data),
  cancel: (id: string) =>
    client.delete<AlgoOrder>(`/api/algo/orders/${id}`).then(r => r.data),
}

// Parent Orders
export const parentOrderApi = {
  list: (accountId: string) =>
    client.get<ParentOrder[]>(`/api/parent-orders?accountId=${accountId}`).then(r => r.data),
  get: (id: string) =>
    client.get<ParentOrder>(`/api/parent-orders/${id}`).then(r => r.data),
  submit: (req: object) =>
    client.post<ParentOrder>('/api/parent-orders', req).then(r => r.data),
}

// Basket Orders
export const basketApi = {
  submit: (req: BasketOrder) =>
    client.post('/api/basket/submit', req).then(r => r.data),
  saved: (accountId: string) =>
    client.get<SavedBasket[]>(`/api/basket/saved?accountId=${accountId}`).then(r => r.data),
  save: (req: object) =>
    client.post<SavedBasket>('/api/basket/save', req).then(r => r.data),
  deleteSaved: (id: string) =>
    client.delete(`/api/basket/saved/${id}`).then(r => r.data),
  executeSaved: (id: string, accountId: string) =>
    client.post(`/api/basket/saved/${id}/execute`, { accountId }).then(r => r.data),
}

// Watchlist
export const watchlistApi = {
  get: (accountId: string) =>
    client.get<WatchlistItem[]>(`/api/watchlist/${accountId}`).then(r => r.data),
  add: (accountId: string, symbol: string, exchange: string) =>
    client.post<WatchlistItem>('/api/watchlist', { accountId, symbol, exchange }).then(r => r.data),
  remove: (id: string) =>
    client.delete(`/api/watchlist/${id}`).then(r => r.data),
}

// Price Alerts
export const alertsApi = {
  list: (accountId: string) =>
    client.get<PriceAlert[]>(`/api/alerts?accountId=${accountId}`).then(r => r.data),
  create: (req: object) =>
    client.post<PriceAlert>('/api/alerts', req).then(r => r.data),
  toggle: (id: string, accountId: string) =>
    client.patch<PriceAlert>(`/api/alerts/${id}/toggle?accountId=${accountId}`).then(r => r.data),
  delete: (id: string, accountId: string) =>
    client.delete(`/api/alerts/${id}?accountId=${accountId}`).then(r => r.data),
}

// Notifications
export const notificationsApi = {
  list: (accountId: string) =>
    client.get<Notification[]>(`/api/notifications/${accountId}`).then(r => r.data),
  count: (accountId: string) =>
    client.get<{ unread: number }>(`/api/notifications/${accountId}/count`).then(r => r.data),
  markRead: (id: string) =>
    client.patch(`/api/notifications/${id}/read`).then(r => r.data),
  markAllRead: (accountId: string) =>
    client.post(`/api/notifications/${accountId}/read-all`).then(r => r.data),
}

// IPO
export const ipoApi = {
  list: () => client.get('/api/ipo').then(r => r.data),
  apply: (req: object) => client.post<IpoApplication>('/api/ipo/apply', req).then(r => r.data),
  applications: (accountId: string) =>
    client.get<IpoApplication[]>(`/api/ipo/applications?accountId=${accountId}`).then(r => r.data),
}

// Settlement
export const settlementApi = {
  list: (accountId: string, from?: string, to?: string) =>
    client.get<Settlement[]>('/api/settlement', { params: { accountId, from, to } }).then(r => r.data),
  summary: (accountId: string) =>
    client.get(`/api/settlement/summary?accountId=${accountId}`).then(r => r.data),
}

// Compliance
export const complianceApi = {
  rules: () => client.get('/api/compliance/rules').then(r => r.data),
  check: (accountId: string) =>
    client.get(`/api/compliance/check?accountId=${accountId}`).then(r => r.data),
  breaches: (accountId: string) =>
    client.get(`/api/compliance/breaches?accountId=${accountId}`).then(r => r.data),
}

// Corporate Actions
export const corporateActionsApi = {
  list: (exchange?: string) =>
    client.get<CorporateAction[]>('/api/corporate-actions', { params: { exchange } }).then(r => r.data),
  get: (id: string) =>
    client.get<CorporateAction>(`/api/corporate-actions/${id}`).then(r => r.data),
}

// Margin
export const marginApi = {
  info: (accountId: string) =>
    client.get<MarginInfo>(`/api/margin/${accountId}`).then(r => r.data),
  limits: (accountId: string) =>
    client.get(`/api/margin/${accountId}/limits`).then(r => r.data),
}

// Order Templates
export const templatesApi = {
  list: (accountId: string) =>
    client.get<OrderTemplate[]>(`/api/order-templates?accountId=${accountId}`).then(r => r.data),
  save: (req: object) =>
    client.post<OrderTemplate>('/api/order-templates', req).then(r => r.data),
  delete: (id: string) =>
    client.delete(`/api/order-templates/${id}`).then(r => r.data),
}

// Cash Ledger
export const ledgerApi = {
  entries: (accountId: string, from?: string, to?: string) =>
    client.get('/api/ledger', { params: { accountId, from, to } }).then(r => r.data),
  summary: (accountId: string) =>
    client.get(`/api/ledger/summary?accountId=${accountId}`).then(r => r.data),
}

// Holiday Calendar
export const holidayApi = {
  list: (exchange?: string, year?: number) =>
    client.get<HolidayCalendar[]>('/api/holidays', { params: { exchange, year } }).then(r => r.data),
}

// Latency Monitor
export const latencyApi = {
  report: () =>
    client.get<LatencyReport[]>('/api/latency/report').then(r => r.data),
  live: () =>
    client.get('/api/latency/live').then(r => r.data),
}

// Risk Limits
export const riskApi = {
  limits: (accountId: string) =>
    client.get(`/api/risk/${accountId}/limits`).then(r => r.data),
  update: (accountId: string, data: object) =>
    client.put(`/api/risk/${accountId}/limits`, data).then(r => r.data),
}

// Dashboard
export const dashboardApi = {
  summary: (accountId: string) =>
    client.get(`/api/dashboard/summary?accountId=${accountId}`).then(r => r.data),
  stats: (accountId: string) =>
    client.get(`/api/dashboard/stats?accountId=${accountId}`).then(r => r.data),
}
