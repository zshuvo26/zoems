import { apiClient } from './client';
import type {
  LoginRequest, LoginResponse,
  Instrument, OhlcvBar, OrderBookResponse, MarketStatusResponse, MarketBreadthResponse,
  Order, OrderAuditEvent, OrderRequest, AmendRequest,
  PortfolioSummary, PerformanceResponse,
  AlgoOrder, AlgoOrderRequest,
  Account, MarginStatus, RiskLimits,
  WatchlistItem,
  Notification, NotificationCount,
  IpoListing, IpoApplication,
  SettlementSummary,
  TcaResponse,
  ComplianceRule, CorporateAction,
  PriceAlert, OrderTemplate, LedgerEntry, ForeignFlowResponse, PreTradeCost,
  PageResponse,
  ParentOrder, ParentOrderRequest,
  SavedBasket,
  HolidayCalendar,
  LatencyReport,
  SmartRouterResult,
  OrderSearchParams,
} from '../types/api';

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (req: LoginRequest) =>
    apiClient.post<LoginResponse>('/api/v1/auth/login', req).then(r => r.data),
  me: () =>
    apiClient.get<LoginResponse>('/api/v1/auth/me').then(r => r.data),
};

// ─── Market ──────────────────────────────────────────────────────────────────
export const marketApi = {
  status: () =>
    apiClient.get<MarketStatusResponse>('/api/v1/market/status').then(r => r.data),

  breadth: (exchange: string) =>
    apiClient.get<MarketBreadthResponse>(`/api/v1/market/breadth/${exchange}`).then(r => r.data),

  instruments: (params: { exchange?: string; search?: string; sector?: string; page?: number; size?: number }) =>
    apiClient.get<PageResponse<Instrument>>('/api/v1/instruments', { params }).then(r => r.data),

  instrument: (symbol: string, exchange: string) =>
    apiClient.get<Instrument>(`/api/v1/instruments/${symbol}`, { params: { exchange } }).then(r => r.data),

  history: (symbol: string, days = 30) =>
    apiClient.get<OhlcvBar[]>(`/api/v1/instruments/${symbol}/history`, { params: { days } }).then(r => r.data),

  orderBook: (symbol: string, exchange: string) =>
    apiClient.get<OrderBookResponse>(`/api/v1/orderbook/${symbol}`, { params: { exchange } }).then(r => r.data),
};

// ─── Orders ──────────────────────────────────────────────────────────────────
export const ordersApi = {
  submit: (req: OrderRequest) =>
    apiClient.post<Order>('/api/v1/orders', req).then(r => r.data),

  get: (id: string) =>
    apiClient.get<Order>(`/api/v1/orders/${id}`).then(r => r.data),

  amend: (id: string, req: AmendRequest) =>
    apiClient.patch<Order>(`/api/v1/orders/${id}`, req).then(r => r.data),

  cancel: (id: string, cancelReason?: string) =>
    apiClient.delete<void>(`/api/v1/orders/${id}`, { data: { cancelReason } }).then(r => r.data),

  byAccount: (accountId: string, status?: string) =>
    apiClient.get<Order[]>(`/api/v1/orders/account/${accountId}`, {
      params: status ? { status } : undefined,
    }).then(r => r.data),

  openOrders: (accountId: string) =>
    apiClient.get<Order[]>(`/api/v1/orders/account/${accountId}/open`).then(r => r.data),

  audit: (orderId: string) =>
    apiClient.get<OrderAuditEvent[]>(`/api/v1/orders/${orderId}/audit`).then(r => r.data),

  search: (params: OrderSearchParams) =>
    apiClient.get<Order[]>('/api/v1/orders/search', { params }).then(r => r.data),

  bulkCancel: (orderIds: string[], reason?: string) =>
    apiClient.post<Order[]>('/api/v1/orders/bulk-cancel', { orderIds, reason }).then(r => r.data),

  clone: (orderId: string) =>
    apiClient.post<Order>(`/api/v1/orders/${orderId}/clone`).then(r => r.data),
};

// ─── Portfolio ───────────────────────────────────────────────────────────────
export const portfolioApi = {
  summary: (accountId: string) =>
    apiClient.get<PortfolioSummary>(`/api/v1/portfolio/${accountId}`).then(r => r.data),

  performance: (accountId: string, period: string) =>
    apiClient.get<PerformanceResponse>(`/api/v1/performance/${accountId}`, { params: { period } }).then(r => r.data),

  tca: (orderId: string) =>
    apiClient.get<TcaResponse>(`/api/v1/tca/order/${orderId}`).then(r => r.data),

  tcaAccount: (accountId: string) =>
    apiClient.get<TcaResponse[]>(`/api/v1/tca/account/${accountId}`).then(r => r.data),
};

// ─── Algo ────────────────────────────────────────────────────────────────────
export const algoApi = {
  create: (req: AlgoOrderRequest) =>
    apiClient.post<AlgoOrder>('/api/v1/algo', req).then(r => r.data),

  get: (algoId: string) =>
    apiClient.get<AlgoOrder>(`/api/v1/algo/${algoId}`).then(r => r.data),

  byAccount: (accountId: string) =>
    apiClient.get<AlgoOrder[]>(`/api/v1/algo/account/${accountId}`).then(r => r.data),

  pause: (algoId: string) =>
    apiClient.post<AlgoOrder>(`/api/v1/algo/${algoId}/pause`).then(r => r.data),

  resume: (algoId: string) =>
    apiClient.post<AlgoOrder>(`/api/v1/algo/${algoId}/resume`).then(r => r.data),

  cancel: (algoId: string, reason?: string) =>
    apiClient.delete<AlgoOrder>(`/api/v1/algo/${algoId}`, { params: { reason } }).then(r => r.data),
};

// ─── Basket ──────────────────────────────────────────────────────────────────
export const basketApi = {
  submit: (req: {
    basketName: string;
    accountId: string;
    allOrNone: boolean;
    orders: OrderRequest[];
  }) => apiClient.post<any>('/api/v1/basket', req).then(r => r.data),
};

// ─── Accounts ────────────────────────────────────────────────────────────────
export const accountsApi = {
  get: (accountId: string) =>
    apiClient.get<Account>(`/api/v1/accounts/${accountId}`).then(r => r.data),

  deposit: (accountId: string, amount: number) =>
    apiClient.post<Account>(`/api/v1/accounts/${accountId}/deposit`, null, { params: { amount } }).then(r => r.data),

  withdraw: (accountId: string, amount: number) =>
    apiClient.post<Account>(`/api/v1/accounts/${accountId}/withdraw`, null, { params: { amount } }).then(r => r.data),

  riskLimits: (accountId: string) =>
    apiClient.get<RiskLimits>(`/api/v1/accounts/${accountId}/risk-limits`).then(r => r.data),

  margin: (accountId: string) =>
    apiClient.get<MarginStatus>(`/api/v1/margin/${accountId}`).then(r => r.data),
};

// ─── Watchlist ───────────────────────────────────────────────────────────────
export const watchlistApi = {
  get: (accountId: string, listName?: string) =>
    apiClient.get<WatchlistItem[]>(`/api/v1/watchlists/${accountId}`, {
      params: listName ? { listName } : undefined,
    }).then(r => r.data),

  lists: (accountId: string) =>
    apiClient.get<string[]>(`/api/v1/watchlists/${accountId}/lists`).then(r => r.data),

  add: (accountId: string, item: Partial<WatchlistItem> & { listName?: string }) =>
    apiClient.post<WatchlistItem>(`/api/v1/watchlists/${accountId}`, { ...item, name: item.listName ?? item.notes }).then(r => r.data),

  remove: (accountId: string, symbol: string, listName?: string) =>
    apiClient.delete<void>(`/api/v1/watchlists/${accountId}/${symbol}`, {
      params: listName ? { listName } : undefined,
    }).then(r => r.data),
};

// ─── Notifications ───────────────────────────────────────────────────────────
export const notificationsApi = {
  all: (accountId: string) =>
    apiClient.get<Notification[]>(`/api/v1/notifications/${accountId}`).then(r => r.data),

  unread: (accountId: string) =>
    apiClient.get<Notification[]>(`/api/v1/notifications/${accountId}/unread`).then(r => r.data),

  count: (accountId: string) =>
    apiClient.get<NotificationCount>(`/api/v1/notifications/${accountId}/count`).then(r => r.data),

  markRead: (id: string) =>
    apiClient.patch<void>(`/api/v1/notifications/${id}/read`).then(r => r.data),

  markAllRead: (accountId: string) =>
    apiClient.post<{ marked: number }>(`/api/v1/notifications/${accountId}/mark-all-read`).then(r => r.data),
};

// ─── IPO ─────────────────────────────────────────────────────────────────────
export const ipoApi = {
  open: () =>
    apiClient.get<IpoListing[]>('/api/v1/ipo/open').then(r => r.data),

  all: () =>
    apiClient.get<IpoListing[]>('/api/v1/ipo').then(r => r.data),

  get: (ipoId: string) =>
    apiClient.get<IpoListing>(`/api/v1/ipo/${ipoId}`).then(r => r.data),

  apply: (ipoId: string, accountId: string, lots: number) =>
    apiClient.post<IpoApplication>(`/api/v1/ipo/${ipoId}/apply`, null, { params: { accountId, lots } }).then(r => r.data),

  applications: (accountId: string) =>
    apiClient.get<IpoApplication[]>(`/api/v1/ipo/applications/${accountId}`).then(r => r.data),
};

// ─── Settlement ──────────────────────────────────────────────────────────────
export const settlementApi = {
  summary: (accountId: string) =>
    apiClient.get<SettlementSummary>(`/api/v1/settlement/${accountId}`).then(r => r.data),
};

// ─── Compliance ──────────────────────────────────────────────────────────────
export const complianceApi = {
  rules: () =>
    apiClient.get<ComplianceRule[]>('/api/v1/compliance/rules').then(r => r.data),
};

// ─── Price Alerts ─────────────────────────────────────────────────────────────
export const alertsApi = {
  list:   (accountId: string) =>
    apiClient.get<PriceAlert[]>(`/api/v1/alerts/${accountId}`).then(r => r.data),
  create: (alert: Partial<PriceAlert>) =>
    apiClient.post<PriceAlert>('/api/v1/alerts', alert).then(r => r.data),
  delete: (id: string, accountId: string) =>
    apiClient.delete<void>(`/api/v1/alerts/${id}`, { params: { accountId } }).then(r => r.data),
  toggle: (id: string, accountId: string) =>
    apiClient.patch<PriceAlert>(`/api/v1/alerts/${id}/toggle`, null, { params: { accountId } }).then(r => r.data),
};

// ─── Order Templates ──────────────────────────────────────────────────────────
export const templatesApi = {
  list:   (accountId: string) =>
    apiClient.get<OrderTemplate[]>(`/api/v1/templates/${accountId}`).then(r => r.data),
  save:   (t: Partial<OrderTemplate>) =>
    apiClient.post<OrderTemplate>('/api/v1/templates', t).then(r => r.data),
  delete: (id: string, accountId: string) =>
    apiClient.delete<void>(`/api/v1/templates/${id}`, { params: { accountId } }).then(r => r.data),
};

// ─── Ledger ───────────────────────────────────────────────────────────────────
export const ledgerApi = {
  history: (accountId: string, page = 0, size = 50) =>
    apiClient.get<PageResponse<LedgerEntry>>(`/api/v1/ledger/${accountId}`, { params: { page, size } }).then(r => r.data),
  commission: (accountId: string) =>
    apiClient.get<{ totalCommission: number }>(`/api/v1/ledger/${accountId}/commission`).then(r => r.data),
};

// ─── Pre-Trade Cost ───────────────────────────────────────────────────────────
export const preTradeApi = {
  cost: (side: string, price: number, quantity: number, exchange = 'DSE') =>
    apiClient.get<PreTradeCost>('/api/v1/pretrade/cost', { params: { side, price, quantity, exchange } }).then(r => r.data),
};

// ─── Foreign Flow ─────────────────────────────────────────────────────────────
export const foreignFlowApi = {
  today:   (exchange = 'DSE') =>
    apiClient.get<ForeignFlowResponse>('/api/v1/foreign-flow', { params: { exchange } }).then(r => r.data),
  history: (exchange = 'DSE', days = 14) =>
    apiClient.get<any[]>('/api/v1/foreign-flow/history', { params: { exchange, days } }).then(r => r.data),
};

// ─── Corporate Actions ────────────────────────────────────────────────────────
export const corporateApi = {
  upcoming: (days = 30) =>
    apiClient.get<CorporateAction[]>('/api/v1/corporate-actions/upcoming', { params: { days } }).then(r => r.data),
  all: () =>
    apiClient.get<CorporateAction[]>('/api/v1/corporate-actions').then(r => r.data),
};

// ─── Parent Orders ────────────────────────────────────────────────────────────
export const parentOrderApi = {
  create: (req: ParentOrderRequest) =>
    apiClient.post<ParentOrder>('/api/v1/parent-orders', req).then(r => r.data),
  get: (id: string) =>
    apiClient.get<ParentOrder>(`/api/v1/parent-orders/${id}`).then(r => r.data),
  byAccount: (accountId: string) =>
    apiClient.get<ParentOrder[]>(`/api/v1/parent-orders/account/${accountId}`).then(r => r.data),
};

// ─── Saved Baskets ────────────────────────────────────────────────────────────
export const savedBasketApi = {
  list: (accountId: string) =>
    apiClient.get<SavedBasket[]>(`/api/v1/saved-baskets/account/${accountId}`).then(r => r.data),
  get: (id: string) =>
    apiClient.get<SavedBasket>(`/api/v1/saved-baskets/${id}`).then(r => r.data),
  save: (payload: { accountId: string; basketName: string; description?: string; allOrNone?: boolean; orders?: any[] }) =>
    apiClient.post<SavedBasket>('/api/v1/saved-baskets', payload).then(r => r.data),
  execute: (id: string) =>
    apiClient.post<any>(`/api/v1/saved-baskets/${id}/execute`).then(r => r.data),
  approve: (id: string) =>
    apiClient.post<SavedBasket>(`/api/v1/saved-baskets/${id}/approve`).then(r => r.data),
  clone: (id: string, newName: string) =>
    apiClient.post<SavedBasket>(`/api/v1/saved-baskets/${id}/clone`, null, { params: { newName } }).then(r => r.data),
  schedule: (id: string, scheduledAt: string) =>
    apiClient.post<SavedBasket>(`/api/v1/saved-baskets/${id}/schedule`, null, { params: { scheduledAt } }).then(r => r.data),
  delete: (id: string) =>
    apiClient.delete<void>(`/api/v1/saved-baskets/${id}`).then(r => r.data),
};

// ─── Holidays ─────────────────────────────────────────────────────────────────
export const holidayApi = {
  list: () =>
    apiClient.get<HolidayCalendar[]>('/api/v1/holidays').then(r => r.data),
  range: (from: string, to: string) =>
    apiClient.get<HolidayCalendar[]>('/api/v1/holidays/range', { params: { from, to } }).then(r => r.data),
  check: (date: string, exchange = 'ALL') =>
    apiClient.get<boolean>('/api/v1/holidays/check', { params: { date, exchange } }).then(r => r.data),
};

// ─── EMS Analytics ───────────────────────────────────────────────────────────
export const emsApi = {
  latencyReport: (periodHours = 24) =>
    apiClient.get<LatencyReport>('/api/v1/ems/latency/report', { params: { periodHours } }).then(r => r.data),
  smartRoute: (symbol: string, side: string, quantity: number, priceLimit?: number) =>
    apiClient.get<SmartRouterResult>('/api/v1/ems/route', {
      params: { symbol, side, quantity, priceLimit },
    }).then(r => r.data),
};
