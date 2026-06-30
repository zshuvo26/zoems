import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// Root stack (auth guard)
export type RootStackParamList = {
  Splash:    undefined;
  Auth:      undefined;
  Main:      undefined;
  Settings:  undefined;
};

// Bottom tabs
export type TabParamList = {
  Dashboard:    undefined;
  Market:       undefined;
  Trade:        undefined;
  Portfolio:    undefined;
  More:         undefined;
};

// Market stack
export type MarketStackParamList = {
  MarketList:       undefined;
  Scanner:          undefined;
  MarketMovers:     undefined;
  SectorHeatmap:    undefined;
  InstrumentDetail: { symbol: string; exchange: string };
  OrderBook:        { symbol: string; exchange: string };
  NewOrder:         { symbol?: string; exchange?: string; side?: 'BUY' | 'SELL' };
};

// Trade stack
export type TradeStackParamList = {
  OrdersList:    undefined;
  NewOrder:      { symbol?: string; exchange?: string; side?: 'BUY' | 'SELL' };
  OrderDetail:   { orderId: string };
  OrderAudit:    { orderId: string };
  AlgoList:      undefined;
  NewAlgoOrder:  { symbol?: string; exchange?: string };
  AlgoDetail:    { algoId: string };
  BasketOrder:   undefined;
};

// Portfolio stack
export type PortfolioStackParamList = {
  PortfolioSummary:   undefined;
  PositionDetail:     { symbol: string; exchange: string };
  Performance:        undefined;
  Tca:                undefined;
  TcaDetail:          { orderId: string };
};

// More stack
export type MoreStackParamList = {
  MoreMenu:           undefined;
  Watchlist:          undefined;
  Notifications:      undefined;
  Ipo:                undefined;
  IpoDetail:          { ipoId: string };
  Margin:             undefined;
  Settlement:         undefined;
  Compliance:         undefined;
  CorporateActions:   undefined;
  RiskLimits:         undefined;
  Settings:           undefined;
  TradeHistory:       undefined;
  News:               undefined;
  AIInsights:         undefined;
  AIPortfolioAdvisor: undefined;
  AIChat:             undefined;
};

export type RootStackProps<T extends keyof RootStackParamList>   = NativeStackScreenProps<RootStackParamList, T>;
export type MarketStackProps<T extends keyof MarketStackParamList> = NativeStackScreenProps<MarketStackParamList, T>;
export type TradeStackProps<T extends keyof TradeStackParamList>  = NativeStackScreenProps<TradeStackParamList, T>;
export type PortfolioStackProps<T extends keyof PortfolioStackParamList> = NativeStackScreenProps<PortfolioStackParamList, T>;
export type MoreStackProps<T extends keyof MoreStackParamList>    = NativeStackScreenProps<MoreStackParamList, T>;
