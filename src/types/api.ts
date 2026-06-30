// Generic API response envelope matching backend
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  errorCode?: string;
  data: T;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  role: 'ADMIN' | 'DEALER' | 'TRADER' | 'VIEWER';
  accountId: string | null;
}

// ─── Market ──────────────────────────────────────────────────────────────────
export interface Instrument {
  symbol: string;
  name: string;
  shortName: string;
  sector: string;
  board: string;
  exchange: 'DSE' | 'CSE';
  lastPrice: number;
  previousClose: number;
  change: number;
  changePct: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  tradedValue: number;
  lotSize: number;
  faceValue: number;
  upperCircuitLimit: number;
  lowerCircuitLimit: number;
  bidPrice: number;
  askPrice: number;
  tradeable: boolean;
  halted: boolean;
  // Fundamentals
  weekHigh52?: number;
  weekLow52?: number;
  peRatio?: number;
  eps?: number;
  dividendYield?: number;
  bookValue?: number;
  marketCap?: number;
  listedShares?: number;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  orders: number;
}

export interface OrderBookResponse {
  symbol: string;
  exchange: string;
  lastPrice: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  bidAskSpread: number;
  bidAskSpreadPct: number;
}

export interface MarketStatusResponse {
  open: boolean;
  preMarket: boolean;
  session: 'PRE_MARKET' | 'PRE_OPEN' | 'REGULAR' | 'CLOSING' | 'AFTER_HOURS' | 'CLOSED';
  message: string;
  currentTime: string;
  nextOpen: string;
  nextClose: string;
}

export interface MarketBreadthResponse {
  exchange: string;
  advancers: number;
  decliners: number;
  unchanged: number;
  indexLevel: number;
  indexChangePct: number;
  totalVolume: number;
  totalTradedValue: number;
  topGainers: Instrument[];
  topLosers: Instrument[];
  mostActive: Instrument[];
}

// ─── Orders ──────────────────────────────────────────────────────────────────
export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'LIMIT' | 'MARKET' | 'STOP_LIMIT' | 'STOP_LOSS';
export type TimeInForce = 'DAY' | 'GTC' | 'IOC' | 'FOK' | 'GTD';
export type OrderStatus =
  | 'NEW' | 'PENDING_NEW' | 'ACKNOWLEDGED' | 'PARTIALLY_FILLED'
  | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'REPLACED' | 'EXPIRED';

export interface OrderRequest {
  accountId: string;
  symbol: string;
  exchange: 'DSE' | 'CSE';
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: TimeInForce;
  displayQuantity?: number;
  source?: string;
}

export interface Order {
  id: string;
  clientOrderId: string;
  accountId: string;
  symbol: string;
  exchange: string;
  side: OrderSide;
  orderType: OrderType;
  timeInForce: TimeInForce;
  status: OrderStatus;
  quantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  price: number;
  stopPrice: number | null;
  avgFillPrice: number | null;
  grossValue: number;
  commission: number;
  netValue: number;
  currency: string;
  rejectionReason: string | null;
  cancelReason: string | null;
  settlementDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface AmendRequest {
  newQuantity?: number;
  newPrice?: number;
}

// ─── Portfolio ───────────────────────────────────────────────────────────────
export interface Position {
  id: string;
  accountId: string;
  symbol: string;
  exchange: string;
  netQuantity: number;
  avgCostPrice: number;
  currentMarketPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalPnL: number;
  totalPnLPct: number;
  dayPnL: number;
  dayPnLPct: number;
}

export interface PortfolioSummary {
  accountId: string;
  cashBalance: number;
  portfolioValue: number;
  totalEquity: number;
  totalPnl: number;
  totalPnlPct: number;
  dayPnl: number;
  dayPnlPct: number;
  positions: Position[];
}

export interface PerformanceResponse {
  period: string;
  portfolioReturnPct: number;
  benchmarkReturnPct: number;
  alphaPct: number;
  portfolioStartValue: number;
  portfolioEndValue: number;
  topContributors: Array<{ symbol: string; contributionPct: number }>;
  bottomContributors: Array<{ symbol: string; contributionPct: number }>;
  sectorAllocations: Array<{ sector: string; allocationPct: number; returnPct: number }>;
}

// ─── Algo ────────────────────────────────────────────────────────────────────
export type AlgoType = 'TWAP' | 'VWAP' | 'POV' | 'IS' | 'ICEBERG';
export type AlgoStatus = 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export interface AlgoOrderRequest {
  accountId: string;
  symbol: string;
  exchange: 'DSE' | 'CSE';
  side: OrderSide;
  algoType: AlgoType;
  totalQuantity: number;
  priceLimit?: number;
  participationRate?: number;
  sliceIntervalSeconds: number;
}

export interface AlgoOrder {
  id: string;
  accountId: string;
  symbol: string;
  exchange: string;
  side: OrderSide;
  algoType: AlgoType;
  status: AlgoStatus;
  totalQuantity: number;
  executedQuantity: number;
  remainingQuantity: number;
  completedSlices: number;
  totalSlices: number;
  avgExecutedPrice: number | null;
  priceLimit: number | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Accounts ────────────────────────────────────────────────────────────────
export interface Account {
  id: string;
  name: string;
  email: string;
  phone: string;
  accountType: string;
  brokerId: string;
  brokerName: string;
  cashBalance: number;
  availableFunds: number;
  active: boolean;
}

export interface MarginStatus {
  accountId: string;
  cashBalance: number;
  portfolioValue: number;
  totalEquity: number;
  marginLimit: number;
  usedMargin: number;
  availableMargin: number;
  marginUtilizationPct: number;
  marginCallActive: boolean;
  liquidationRisk: boolean;
  buyingPower: number;
}

export interface RiskLimits {
  accountId: string;
  maxOrderValue: number;
  maxPositionValue: number;
  maxOrdersPerDay: number;
  maxLossPerDay: number;
  marginMultiplier: number;
}

// ─── Watchlist ───────────────────────────────────────────────────────────────
export interface WatchlistItem {
  id: string;
  accountId: string;
  symbol: string;
  exchange: string;
  alertUpperPrice: string | null;
  alertLowerPrice: string | null;
  notes: string | null;  // used as list name
  lastPrice?: number;
  change?: number;
  changePct?: number;
}

// ─── Notifications ───────────────────────────────────────────────────────────
export type NotificationType =
  | 'ORDER_FILLED' | 'ORDER_PARTIALLY_FILLED' | 'ORDER_CANCELLED' | 'ORDER_REJECTED'
  | 'PRICE_ALERT_HIGH' | 'PRICE_ALERT_LOW'
  | 'MARGIN_CALL' | 'LIQUIDATION_WARNING'
  | 'CORPORATE_ACTION' | 'IPO_ALLOTMENT'
  | 'SETTLEMENT_DUE';

export interface Notification {
  id: string;
  accountId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  referenceId: string | null;
  createdAt: string;
}

export interface NotificationCount {
  unread: number;
  total: number;
}

// ─── IPO ─────────────────────────────────────────────────────────────────────
export interface IpoListing {
  ipoId: string;
  symbol: string;
  companyName: string;
  sector: string;
  issuePrice: number;
  faceValue: number;
  lotSize: number;
  minLots: number;
  maxLots: number;
  totalSharesOnOffer: number;
  subscriptionOpen: string;
  subscriptionClose: string;
  allotmentDate: string;
  listingDate: string;
  status: 'OPEN' | 'CLOSED' | 'ALLOTTED' | 'LISTED';
}

export interface IpoApplication {
  id: string;
  ipoId: string;
  accountId: string;
  appliedLots: number;
  allottedLots: number | null;
  amountPaid: number;
  refundAmount: number | null;
  status: 'APPLIED' | 'ALLOTTED' | 'REFUNDED' | 'PENDING';
  appliedAt: string;
}

// ─── Settlement ──────────────────────────────────────────────────────────────
export interface SettlementSummary {
  accountId: string;
  totalTrades: number;
  settled: number;
  pending: number;
  totalNetPayable: number;
  totalNetReceivable: number;
  netSettlementAmount: number;
}

// ─── TCA ─────────────────────────────────────────────────────────────────────
export interface TcaResponse {
  orderId: string;
  symbol: string;
  side: OrderSide;
  arrivalPrice: number;
  vwapFill: number;
  slippageBdt: number;
  slippageBps: number;
  implementationShortfallBps: number;
  marketImpactPct: number;
  totalCostBdt: number;
  totalCostBps: number;
  fills: Array<{
    price: number;
    quantity: number;
    timestamp: string;
    slippageBps: number;
  }>;
}

// ─── Compliance ──────────────────────────────────────────────────────────────
export interface ComplianceRule {
  id: string;
  ruleType: string;
  scope: string;
  ruleValue: string;
  description: string;
  active: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
}

// ─── Chart / Price History ────────────────────────────────────────────────────
export interface OhlcvBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ─── Order Audit ─────────────────────────────────────────────────────────────
export interface OrderAuditEvent {
  id: string;
  eventType: string;
  status: string;
  message: string | null;
  timestamp: string;
  filledQty: number | null;
  avgFillPrice: number | null;
  rejectionReason: string | null;
}

// ─── Corporate Actions ────────────────────────────────────────────────────────
export interface CorporateAction {
  id: string;
  symbol: string;
  exchange: string;
  type: 'CASH_DIVIDEND' | 'BONUS_SHARE' | 'STOCK_SPLIT' | 'REVERSE_SPLIT' | 'RIGHTS_ISSUE';
  announcementDate: string;
  exDate: string;
  recordDate: string | null;
  paymentDate: string | null;
  ratio: number;
  description: string;
  processed: boolean;
}
