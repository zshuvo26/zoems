import React, { useState, useEffect, useMemo } from 'react';
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
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatBDT, formatPrice, formatChangePct, formatChange, changeColor, formatVolume } from '../../utils/formatters';
import { haptic } from '../../utils/haptics';
import type { MarketStackProps } from '../../navigation/types';
import type { Instrument } from '../../types/api';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - Spacing.base * 2 - 2;

type Tab = 'chart' | 'stats' | 'depth';

function generateIntradayData(inst: Instrument, points = 30): { value: number }[] {
  const open   = inst.openPrice   ?? inst.lastPrice;
  const high   = inst.highPrice   ?? inst.lastPrice * 1.02;
  const low    = inst.lowPrice    ?? inst.lastPrice * 0.98;
  const close  = inst.lastPrice;
  const range  = high - low;

  const data: { value: number }[] = [];
  // First quarter: open → drift toward high
  // Mid: high → dip toward low
  // Final: recover to close
  for (let i = 0; i < points; i++) {
    const pct = i / (points - 1);
    let base: number;
    if (pct < 0.3) {
      base = open + (high - open) * (pct / 0.3);
    } else if (pct < 0.6) {
      base = high - (high - low) * ((pct - 0.3) / 0.3);
    } else {
      base = low + (close - low) * ((pct - 0.6) / 0.4);
    }
    const noise = (Math.sin(i * 2.7) * 0.3 + Math.cos(i * 1.3) * 0.2) * range * 0.08;
    data.push({ value: Math.round((base + noise) * 100) / 100 });
  }
  return data;
}

export default function InstrumentDetailScreen({ route, navigation }: MarketStackProps<'InstrumentDetail'>) {
  const { symbol, exchange } = route.params;
  const { accountId } = useAuthStore();
  const [livePrice, setLivePrice] = useState<Partial<Instrument>>({});
  const [tab, setTab] = useState<Tab>('chart');

  const { data: inst, isLoading, isError, refetch } = useQuery({
    queryKey: ['instrument', symbol, exchange],
    queryFn:  () => marketApi.instrument(symbol, exchange),
    refetchInterval: 5_000,
  });

  const { subscribe } = useWebSocket(accountId);
  useEffect(() => {
    return subscribe(`/topic/market/${symbol}`, (data) => setLivePrice(data));
  }, [symbol, subscribe]);

  const displayPrice  = livePrice.lastPrice  ?? inst?.lastPrice  ?? 0;
  const displayChange = livePrice.change      ?? inst?.change     ?? 0;
  const displayPct    = livePrice.changePct   ?? inst?.changePct  ?? 0;
  const color         = changeColor(displayChange);

  const chartData = useMemo(() => inst ? generateIntradayData(inst) : [], [inst?.symbol, inst?.lastPrice]);

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

  return (
    <View style={styles.root}>
      {/* Price Header */}
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

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['chart', 'stats', 'depth'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => { haptic.light(); setTab(t); }}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'chart' ? 'Chart' : t === 'stats' ? 'Statistics' : 'L2 Depth'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* CHART TAB */}
        {tab === 'chart' && (
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Intraday Price</Text>
              <Text style={styles.chartSub}>10:00 – 14:30 BST (simulated)</Text>
            </View>

            <LineChart
              data={chartData}
              width={CHART_W}
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
              hideDataPoints={chartData.length > 20}
              xAxisColor={Colors.border.default}
              yAxisColor={Colors.border.default}
              yAxisTextStyle={{ color: Colors.text.muted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: Colors.text.muted, fontSize: 9 }}
              noOfSections={4}
              yAxisLabelWidth={50}
              backgroundColor={Colors.bg.secondary}
              rulesColor={Colors.border.subtle}
              rulesType="solid"
            />

            {/* OHLC summary */}
            <View style={styles.ohlcRow}>
              <OhlcItem label="O" value={formatPrice(inst.openPrice)} color={Colors.text.secondary} />
              <OhlcItem label="H" value={formatPrice(inst.highPrice)} color={Colors.bull} />
              <OhlcItem label="L" value={formatPrice(inst.lowPrice)} color={Colors.bear} />
              <OhlcItem label="C" value={formatPrice(inst.lastPrice)} color={color} />
            </View>

            {/* Volume bar */}
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

            {/* Circuit breaker range */}
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

        {/* STATS TAB */}
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

        {/* DEPTH TAB */}
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

      {/* Buy / Sell Buttons */}
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

  tabs: {
    flexDirection: 'row', backgroundColor: Colors.bg.secondary,
    borderBottomWidth: 1, borderBottomColor: Colors.border.default,
  },
  tab:           { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center' },
  tabActive:     { borderBottomWidth: 2, borderBottomColor: Colors.accent.blue },
  tabText:       { color: Colors.text.muted, fontSize: Typography.size.sm, fontWeight: '600' },
  tabTextActive: { color: Colors.accent.blue },

  scroll:        { flex: 1 },
  scrollContent: { padding: Spacing.base, gap: Spacing.sm, paddingBottom: 100 },

  // Chart
  chartContainer: {
    backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border.subtle,
    padding: Spacing.base, gap: Spacing.sm, overflow: 'hidden',
  },
  chartHeader: { gap: 2 },
  chartTitle:  { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700' },
  chartSub:    { color: Colors.text.muted, fontSize: 10 },

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

  // Stats tab
  bidAskRow: { flexDirection: 'row', gap: Spacing.sm },
  bidAskBox: { flex: 1, borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', gap: 4 },
  bidAskLabel:{ color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '700', letterSpacing: 1 },
  bidAskPrice:{ fontSize: Typography.size.lg, fontWeight: '800', fontFamily: 'monospace' },

  // Depth tab
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
