import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import { marketApi, watchlistApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { LoadingView, ErrorView, Card, StatRow, Badge, SectionHeader } from '../../components/common';
import CandlestickChart from '../../components/common/CandlestickChart';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatBDT, formatPrice, formatChangePct, formatChange, changeColor, formatVolume, formatCompact } from '../../utils/formatters';
import { haptic } from '../../utils/haptics';
import type { MarketStackProps } from '../../navigation/types';
import type { Instrument } from '../../types/api';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - Spacing.base * 2 - 2;

type Tab = 'chart' | 'fundamentals' | 'stats' | 'depth';
type Period = '1W' | '1M' | '3M' | '6M' | '1Y';
type ChartType = 'line' | 'candle';

const PERIOD_DAYS: Record<Period, number> = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };

export default function InstrumentDetailScreen({ route, navigation }: MarketStackProps<'InstrumentDetail'>) {
  const { symbol, exchange } = route.params;
  const { accountId } = useAuthStore();
  const [livePrice, setLivePrice] = useState<Partial<Instrument>>({});
  const [tab, setTab] = useState<Tab>('chart');
  const [period, setPeriod] = useState<Period>('1M');
  const [chartType, setChartType] = useState<ChartType>('line');

  const { data: inst, isLoading, isError, refetch } = useQuery({
    queryKey: ['instrument', symbol, exchange],
    queryFn:  () => marketApi.instrument(symbol, exchange),
    refetchInterval: 5_000,
  });

  const { data: historyBars } = useQuery({
    queryKey: ['history', symbol, period],
    queryFn:  () => marketApi.history(symbol, PERIOD_DAYS[period]),
    enabled: tab === 'chart',
    staleTime: 5 * 60_000,
  });

  const { subscribe } = useWebSocket(accountId);
  useEffect(() => {
    return subscribe(`/topic/market/${symbol}`, (data) => setLivePrice(data));
  }, [symbol, subscribe]);

  const displayPrice  = livePrice.lastPrice  ?? inst?.lastPrice  ?? 0;
  const displayChange = livePrice.change      ?? inst?.change     ?? 0;
  const displayPct    = livePrice.changePct   ?? inst?.changePct  ?? 0;
  const color         = changeColor(displayChange);

  const lineData   = (historyBars ?? []).map((b: import('../../types/api').OhlcvBar) => ({ value: b.close }));
  const candleData = (historyBars ?? []).map((b: import('../../types/api').OhlcvBar) => ({
    open: b.open, high: b.high, low: b.low, close: b.close,
  }));

  if (isLoading) return <LoadingView />;
  if (isError || !inst) return <ErrorView onRetry={refetch} />;

  const handleBuy  = () => { haptic.medium(); navigation.push('NewOrder', { symbol, exchange, side: 'BUY' }); };
  const handleSell = () => { haptic.medium(); navigation.push('NewOrder', { symbol, exchange, side: 'SELL' }); };

  const addToWatchlist = async () => {
    if (!accountId) return;
    try {
      await watchlistApi.add(accountId, { symbol, exchange });
      haptic.success();
      Alert.alert('Added', `${symbol} added to watchlist`);
    } catch {
      haptic.error();
      Alert.alert('Error', 'Already in watchlist or network error');
    }
  };

  const marketCapCr = inst.marketCap ? inst.marketCap / 10_000_000 : null;
  const w52Pos = inst.weekHigh52 && inst.weekLow52 && inst.weekHigh52 > inst.weekLow52
    ? Math.min(Math.max(((displayPrice - inst.weekLow52) / (inst.weekHigh52 - inst.weekLow52)) * 100, 0), 100)
    : null;
  const candleWidth = Math.max(4, Math.min(12, Math.floor((CHART_W - 60) / Math.max(candleData.length, 1))));

  return (
    <View style={styles.root}>
      <View style={styles.priceHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={2}>{inst.name}</Text>
          <View style={styles.metaRow}>
            <Badge label={inst.exchange} />
            <Badge label={inst.sector} color={Colors.status.pending} style={{ marginLeft: 4 }} />
            {inst.halted && <Badge label="HALTED" color={Colors.bear} style={{ marginLeft: 4 }} />}
          </View>
        </View>
        <TouchableOpacity onPress={addToWatchlist} style={styles.watchlistBtn}>
          <Ionicons name="star-outline" size={22} color={Colors.accent.blue} />
        </TouchableOpacity>
      </View>

      <View style={styles.priceBlock}>
        <Text style={[styles.price, { color }]}>{formatPrice(displayPrice)}</Text>
        <Text style={[styles.change, { color }]}>
          {formatChange(displayChange)} ({formatChangePct(displayPct)})
        </Text>
        <Text style={styles.prevClose}>Prev Close: {formatPrice(inst.previousClose)}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
        <View style={styles.tabs}>
          {(['chart', 'fundamentals', 'stats', 'depth'] as Tab[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => { haptic.light(); setTab(t); }}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'chart' ? 'Chart' : t === 'fundamentals' ? 'Fundamentals' : t === 'stats' ? 'Statistics' : 'L2 Depth'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {tab === 'chart' && (
          <View style={styles.chartContainer}>
            <View style={styles.chartHeaderRow}>
              <View style={styles.chartTypeToggle}>
                <TouchableOpacity
                  style={[styles.chartTypeBtn, chartType === 'line' && styles.chartTypeBtnActive]}
                  onPress={() => setChartType('line')}
                >
                  <Ionicons name="trending-up" size={13} color={chartType === 'line' ? Colors.white : Colors.text.muted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chartTypeBtn, chartType === 'candle' && styles.chartTypeBtnActive]}
                  onPress={() => setChartType('candle')}
                >
                  <Ionicons name="bar-chart" size={13} color={chartType === 'candle' ? Colors.white : Colors.text.muted} />
                </TouchableOpacity>
              </View>
              <View style={styles.periodRow}>
                {(['1W', '1M', '3M', '6M', '1Y'] as Period[]).map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                    onPress={() => { haptic.light(); setPeriod(p); }}
                  >
                    <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {chartType === 'line' ? (
              <LineChart
                data={lineData}
                width={CHART_W - Spacing.base * 2}
                height={180}
                color={color}
                thickness={2}
                dataPointsColor={color}
                dataPointsRadius={3}
                startFillColor={color}
                endFillColor={Colors.bg.secondary}
                startOpacity={0.25}
                endOpacity={0}
                areaChart
                curved
                hideDataPoints={lineData.length > 20}
                xAxisColor={Colors.border.default}
                yAxisColor={Colors.border.default}
                yAxisTextStyle={{ color: Colors.text.muted, fontSize: 10 }}
                noOfSections={4}
                yAxisLabelWidth={50}
                backgroundColor={Colors.bg.secondary}
                rulesColor={Colors.border.subtle}
                rulesType="solid"
              />
            ) : (
              <CandlestickChart
                data={candleData}
                width={CHART_W - Spacing.base * 2}
                height={200}
                bullColor={Colors.bull}
                bearColor={Colors.bear}
                backgroundColor={Colors.bg.secondary}
              />
            )}

            <View style={styles.ohlcRow}>
              <OhlcItem label="O" value={formatPrice(inst.openPrice)} color={Colors.text.secondary} />
              <OhlcItem label="H" value={formatPrice(inst.highPrice)} color={Colors.bull} />
              <OhlcItem label="L" value={formatPrice(inst.lowPrice)} color={Colors.bear} />
              <OhlcItem label="C" value={formatPrice(inst.lastPrice)} color={color} />
            </View>

            <View style={styles.volumeSection}>
              <Text style={styles.volumeLabel}>Volume</Text>
              <View style={styles.volumeBarBg}>
                <View style={[styles.volumeBarFill, {
                  width: `${Math.min(((inst.volume ?? 0) / 1_000_000) * 100, 100)}%`,
                  backgroundColor: color,
                }]} />
              </View>
              <Text style={[styles.volumeValue, { color }]}>{formatVolume(inst.volume)}</Text>
            </View>

            <View style={styles.rangeSection}>
              <View style={styles.rangeRow}>
                <Text style={[styles.rangeLimit, { color: Colors.bear }]}>{formatPrice(inst.lowerCircuitLimit)}</Text>
                <View style={styles.rangeBar}>
                  <View style={[styles.rangePos, {
                    left: `${Math.min(Math.max(((displayPrice - (inst.lowerCircuitLimit ?? 0)) / ((inst.upperCircuitLimit ?? 1) - (inst.lowerCircuitLimit ?? 0))) * 100, 0), 100)}%`,
                  }]} />
                </View>
                <Text style={[styles.rangeLimit, { color: Colors.bull }]}>{formatPrice(inst.upperCircuitLimit)}</Text>
              </View>
              <Text style={styles.rangeSub}>Daily circuit limits (±10%)</Text>
            </View>
          </View>
        )}

        {tab === 'fundamentals' && (
          <>
            <Card style={{ gap: 2 }}>
              <SectionHeader title="Valuation Metrics" />
              <StatRow label="P/E Ratio"        value={inst.peRatio != null ? `${inst.peRatio.toFixed(1)}x` : '—'} />
              <StatRow label="EPS (BDT)"         value={inst.eps != null ? formatPrice(inst.eps) : '—'} />
              <StatRow label="Book Value (BDT)"  value={inst.bookValue != null ? formatPrice(inst.bookValue) : '—'} />
              <StatRow label="P/B Ratio"         value={inst.bookValue && inst.bookValue > 0
                ? `${(displayPrice / inst.bookValue).toFixed(2)}x` : '—'} />
              <StatRow label="Dividend Yield"    value={inst.dividendYield != null ? `${inst.dividendYield.toFixed(2)}%` : '—'} valueColor={Colors.bull} />
              <StatRow label="Face Value (BDT)"  value={formatBDT(inst.faceValue)} />
            </Card>

            <Card style={{ gap: 2 }}>
              <SectionHeader title="Company Data" />
              <StatRow label="Market Cap"    value={marketCapCr != null ? `৳${marketCapCr.toFixed(0)} Cr` : '—'} />
              <StatRow label="Listed Shares" value={inst.listedShares != null ? formatCompact(inst.listedShares) : '—'} />
              <StatRow label="Sector"        value={inst.sector ?? '—'} />
              <StatRow label="Board"         value={inst.board ?? '—'} />
              <StatRow label="Exchange"      value={inst.exchange} />
              <StatRow label="Lot Size"      value={`${inst.lotSize} shares`} />
            </Card>

            {inst.weekHigh52 != null && inst.weekLow52 != null && (
              <Card style={{ gap: Spacing.sm }}>
                <SectionHeader title="52-Week Range" />
                <View style={styles.w52Row}>
                  <Text style={[styles.w52Price, { color: Colors.bear }]}>{formatPrice(inst.weekLow52)}</Text>
                  <View style={styles.w52Bar}>
                    <View style={[styles.w52Fill, { width: `${w52Pos ?? 50}%` }]} />
                    <View style={[styles.w52Dot, { left: `${w52Pos ?? 50}%` }]} />
                  </View>
                  <Text style={[styles.w52Price, { color: Colors.bull }]}>{formatPrice(inst.weekHigh52)}</Text>
                </View>
                <Text style={styles.w52Sub}>
                  Current {formatPrice(displayPrice)} · {(w52Pos ?? 0).toFixed(0)}% above 52W low
                </Text>
              </Card>
            )}
          </>
        )}

        {tab === 'stats' && (
          <>
            <Card style={{ gap: 2 }}>
              <SectionHeader title="Day Statistics" />
              <StatRow label="Open"         value={formatPrice(inst.openPrice ?? displayPrice)} />
              <StatRow label="High"         value={formatPrice(inst.highPrice ?? displayPrice)} valueColor={Colors.bull} />
              <StatRow label="Low"          value={formatPrice(inst.lowPrice ?? displayPrice)} valueColor={Colors.bear} />
              <StatRow label="Volume"       value={formatVolume(inst.volume ?? 0)} />
              <StatRow label="Traded Value" value={formatBDT(inst.tradedValue)} />
              <StatRow label="Lot Size"     value={String(inst.lotSize)} />
              <StatRow label="Face Value"   value={formatBDT(inst.faceValue)} />
            </Card>

            <Card style={{ gap: 6 }}>
              <SectionHeader title="Best Bid / Ask" action="L2 Depth" onAction={() => { haptic.light(); navigation.push('OrderBook', { symbol, exchange }); }} />
              <View style={styles.bidAskRow}>
                <View style={[styles.bidAskBox, { borderColor: Colors.bull + '44', backgroundColor: Colors.bull + '11' }]}>
                  <Text style={styles.bidAskLabel}>BID</Text>
                  <Text style={[styles.bidAskPrice, { color: Colors.bull }]}>{formatPrice(inst.bidPrice)}</Text>
                </View>
                <View style={[styles.bidAskBox, { borderColor: Colors.bear + '44', backgroundColor: Colors.bear + '11' }]}>
                  <Text style={styles.bidAskLabel}>ASK</Text>
                  <Text style={[styles.bidAskPrice, { color: Colors.bear }]}>{formatPrice(inst.askPrice)}</Text>
                </View>
              </View>
            </Card>
          </>
        )}

        {tab === 'depth' && (
          <TouchableOpacity
            style={styles.depthRedirect}
            onPress={() => { haptic.light(); navigation.push('OrderBook', { symbol, exchange }); }}
            activeOpacity={0.8}
          >
            <Ionicons name="layers-outline" size={40} color={Colors.accent.blue} />
            <Text style={styles.depthTitle}>Level 2 Order Book</Text>
            <Text style={styles.depthSub}>Tap to view full bid/ask depth for {symbol}</Text>
            <View style={styles.depthBtn}>
              <Text style={styles.depthBtnText}>Open Order Book</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.white} />
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      {inst.tradeable && !inst.halted && (
        <View style={styles.actionBar}>
          <TouchableOpacity style={[styles.actionBtn, styles.sellBtn]} onPress={handleSell} activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>SELL</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.buyBtn]} onPress={handleBuy} activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>BUY</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function OhlcItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.ohlcItem}>
      <Text style={styles.ohlcLabel}>{label}</Text>
      <Text style={[styles.ohlcValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg.primary },
  priceHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: Spacing.base, paddingBottom: Spacing.xs, backgroundColor: Colors.bg.secondary,
  },
  name:    { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '700', flex: 1, marginRight: Spacing.sm },
  metaRow: { flexDirection: 'row', marginTop: 6 },
  watchlistBtn: { padding: 4 },

  priceBlock: { backgroundColor: Colors.bg.secondary, paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border.subtle },
  price:     { fontSize: 36, fontWeight: '800', fontFamily: 'monospace' },
  change:    { fontSize: Typography.size.md, fontWeight: '700', marginTop: 2 },
  prevClose: { color: Colors.text.muted, fontSize: Typography.size.xs, marginTop: 4 },

  tabsScroll: { backgroundColor: Colors.bg.secondary, borderBottomWidth: 1, borderBottomColor: Colors.border.default, maxHeight: 44 },
  tabs: { flexDirection: 'row' },
  tab:           { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.base, alignItems: 'center' },
  tabActive:     { borderBottomWidth: 2, borderBottomColor: Colors.accent.blue },
  tabText:       { color: Colors.text.muted, fontSize: Typography.size.sm, fontWeight: '600' },
  tabTextActive: { color: Colors.accent.blue },

  scroll:        { flex: 1 },
  scrollContent: { padding: Spacing.base, gap: Spacing.sm, paddingBottom: 100 },

  chartContainer: {
    backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border.subtle,
    padding: Spacing.base, gap: Spacing.sm, overflow: 'hidden',
  },
  chartHeaderRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartTypeToggle:    { flexDirection: 'row', gap: 2, backgroundColor: Colors.bg.primary, borderRadius: 6, padding: 2 },
  chartTypeBtn:       { width: 26, height: 26, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  chartTypeBtnActive: { backgroundColor: Colors.accent.blue },
  periodRow:          { flexDirection: 'row', gap: 3 },
  periodBtn:          { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: Colors.bg.primary },
  periodBtnActive:    { backgroundColor: Colors.accent.blue },
  periodText:         { color: Colors.text.muted, fontSize: 10, fontWeight: '600' },
  periodTextActive:   { color: Colors.white },

  ohlcRow:   { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: Spacing.xs, borderTopWidth: 1, borderTopColor: Colors.border.subtle },
  ohlcItem:  { alignItems: 'center', gap: 2 },
  ohlcLabel: { color: Colors.text.muted, fontSize: 10, fontWeight: '700' },
  ohlcValue: { fontSize: Typography.size.xs, fontWeight: '700', fontFamily: 'monospace' },

  volumeSection: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  volumeLabel:   { color: Colors.text.muted, fontSize: 10, width: 44 },
  volumeBarBg:   { flex: 1, height: 4, backgroundColor: Colors.border.default, borderRadius: 2, overflow: 'hidden' },
  volumeBarFill: { height: '100%', borderRadius: 2 },
  volumeValue:   { fontSize: 10, fontWeight: '700', width: 52, textAlign: 'right' },

  rangeSection: { gap: 4 },
  rangeRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  rangeBar:     { flex: 1, height: 4, backgroundColor: Colors.border.default, borderRadius: 2, position: 'relative' },
  rangePos:     { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent.blue, top: -2 },
  rangeLimit:   { fontSize: 10, fontWeight: '700', width: 50 },
  rangeSub:     { color: Colors.text.muted, fontSize: 10, textAlign: 'center' },

  w52Row:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  w52Bar:  { flex: 1, height: 6, backgroundColor: Colors.border.default, borderRadius: 3, position: 'relative', overflow: 'hidden' },
  w52Fill: { height: '100%', backgroundColor: Colors.accent.blue + '55', borderRadius: 3 },
  w52Dot:  { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent.blue, top: -2, marginLeft: -5 },
  w52Price: { fontSize: Typography.size.xs, fontWeight: '700', fontFamily: 'monospace', width: 55 },
  w52Sub:  { color: Colors.text.muted, fontSize: 11, textAlign: 'center' },

  bidAskRow:   { flexDirection: 'row', gap: Spacing.sm },
  bidAskBox:   { flex: 1, borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', gap: 4 },
  bidAskLabel: { color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '700', letterSpacing: 1 },
  bidAskPrice: { fontSize: Typography.size.lg, fontWeight: '800', fontFamily: 'monospace' },

  depthRedirect: {
    backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: Colors.accent.blue + '33',
    alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'],
    gap: Spacing.sm, marginTop: Spacing.xl,
  },
  depthTitle: { color: Colors.text.primary, fontSize: Typography.size.lg, fontWeight: '700' },
  depthSub:   { color: Colors.text.muted, fontSize: Typography.size.sm, textAlign: 'center' },
  depthBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.accent.blue, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl, marginTop: Spacing.sm,
  },
  depthBtnText: { color: Colors.white, fontWeight: '700', fontSize: Typography.size.sm },

  actionBar: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.base, backgroundColor: Colors.bg.secondary, borderTopWidth: 1, borderTopColor: Colors.border.default },
  actionBtn: { flex: 1, paddingVertical: Spacing.base, borderRadius: BorderRadius.md, alignItems: 'center' },
  buyBtn:    { backgroundColor: Colors.bull },
  sellBtn:   { backgroundColor: Colors.bear },
  actionBtnText: { color: Colors.white, fontSize: Typography.size.base, fontWeight: '800', letterSpacing: 1 },
});
