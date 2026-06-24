import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { marketApi, watchlistApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { LoadingView, ErrorView, Card, StatRow, Badge, SectionHeader } from '../../components/common';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatBDT, formatPrice, formatChangePct, formatChange, changeColor, formatVolume } from '../../utils/formatters';
import type { MarketStackProps } from '../../navigation/types';
import type { Instrument } from '../../types/api';

export default function InstrumentDetailScreen({ route, navigation }: MarketStackProps<'InstrumentDetail'>) {
  const { symbol, exchange } = route.params;
  const { accountId } = useAuthStore();
  const [livePrice, setLivePrice] = useState<Partial<Instrument>>({});

  const { data: inst, isLoading, isError, refetch } = useQuery({
    queryKey: ['instrument', symbol, exchange],
    queryFn:  () => marketApi.instrument(symbol, exchange),
    refetchInterval: 5_000,
  });

  // WebSocket live price
  const { subscribe } = useWebSocket(accountId);
  useEffect(() => {
    return subscribe(`/topic/market/${symbol}`, (data) => {
      setLivePrice(data);
    });
  }, [symbol, subscribe]);

  const displayPrice  = livePrice.lastPrice  ?? inst?.lastPrice  ?? 0;
  const displayChange = livePrice.change      ?? inst?.change     ?? 0;
  const displayPct    = livePrice.changePct   ?? inst?.changePct  ?? 0;
  const color         = changeColor(displayChange);

  if (isLoading) return <LoadingView />;
  if (isError || !inst) return <ErrorView onRetry={refetch} />;

  const handleBuy  = () => navigation.push('NewOrder', { symbol, exchange, side: 'BUY' });
  const handleSell = () => navigation.push('NewOrder', { symbol, exchange, side: 'SELL' });

  const addToWatchlist = async () => {
    if (!accountId) return;
    try {
      await watchlistApi.add(accountId, { symbol, exchange });
      Alert.alert('Added', `${symbol} added to watchlist`);
    } catch {
      Alert.alert('Error', 'Already in watchlist or network error');
    }
  };

  return (
    <View style={styles.root}>
      {/* Price Header */}
      <View style={styles.priceHeader}>
        <View>
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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Circuit Breakers */}
        <Card style={styles.circuitCard}>
          <Text style={styles.circuitLabel}>Circuit Breakers (±10%)</Text>
          <View style={styles.circuitRow}>
            <View>
              <Text style={styles.circuitSub}>Lower</Text>
              <Text style={[styles.circuitVal, { color: Colors.bear }]}>{formatPrice(inst.lowerCircuitLimit)}</Text>
            </View>
            <View style={styles.circuitBar}>
              <View style={[styles.circuitFill, {
                left:  `${((displayPrice - (inst.lowerCircuitLimit ?? 0)) / ((inst.upperCircuitLimit ?? 1) - (inst.lowerCircuitLimit ?? 0))) * 100}%`
              }]} />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.circuitSub}>Upper</Text>
              <Text style={[styles.circuitVal, { color: Colors.bull }]}>{formatPrice(inst.upperCircuitLimit)}</Text>
            </View>
          </View>
        </Card>

        {/* OHLV */}
        <Card style={{ gap: 2 }}>
          <SectionHeader title="Day Statistics" />
          <StatRow label="Open"   value={formatPrice(inst.openPrice ?? displayPrice)} />
          <StatRow label="High"   value={formatPrice(inst.highPrice ?? displayPrice)} valueColor={Colors.bull} />
          <StatRow label="Low"    value={formatPrice(inst.lowPrice ?? displayPrice)} valueColor={Colors.bear} />
          <StatRow label="Volume" value={formatVolume(inst.volume ?? 0)} />
          <StatRow label="Traded Value" value={formatBDT(inst.tradedValue)} />
          <StatRow label="Lot Size" value={String(inst.lotSize)} />
          <StatRow label="Face Value" value={formatBDT(inst.faceValue)} />
        </Card>

        {/* Bid/Ask */}
        <Card style={{ gap: 6 }}>
          <SectionHeader title="Best Bid / Ask" action="L2 Depth" onAction={() => navigation.push('OrderBook', { symbol, exchange })} />
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

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg.primary },
  priceHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: Spacing.base, paddingBottom: Spacing.xs, backgroundColor: Colors.bg.secondary,
  },
  name:    { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '700', flex: 1, marginRight: Spacing.sm },
  metaRow: { flexDirection: 'row', marginTop: 6 },
  watchlistBtn: { padding: 4 },

  priceBlock: { backgroundColor: Colors.bg.secondary, paddingHorizontal: Spacing.base, paddingBottom: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border.subtle },
  price:     { fontSize: 36, fontWeight: '800', fontFamily: 'monospace' },
  change:    { fontSize: Typography.size.md, fontWeight: '700', marginTop: 2 },
  prevClose: { color: Colors.text.muted, fontSize: Typography.size.xs, marginTop: 4 },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.base, gap: Spacing.sm, paddingBottom: 100 },

  circuitCard: { gap: Spacing.sm },
  circuitLabel:{ color: Colors.text.secondary, fontSize: Typography.size.xs, fontWeight: '600' },
  circuitRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  circuitSub:  { color: Colors.text.muted, fontSize: 10 },
  circuitVal:  { fontSize: Typography.size.sm, fontWeight: '700' },
  circuitBar:  { flex: 1, height: 4, backgroundColor: Colors.border.default, borderRadius: 2, position: 'relative' },
  circuitFill: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent.blue, top: -2 },

  bidAskRow: { flexDirection: 'row', gap: Spacing.sm },
  bidAskBox: { flex: 1, borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', gap: 4 },
  bidAskLabel:{ color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '700', letterSpacing: 1 },
  bidAskPrice:{ fontSize: Typography.size.lg, fontWeight: '800', fontFamily: 'monospace' },

  actionBar: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.base, backgroundColor: Colors.bg.secondary, borderTopWidth: 1, borderTopColor: Colors.border.default },
  actionBtn: { flex: 1, paddingVertical: Spacing.base, borderRadius: BorderRadius.md, alignItems: 'center' },
  buyBtn:    { backgroundColor: Colors.bull },
  sellBtn:   { backgroundColor: Colors.bear },
  actionBtnText: { color: Colors.white, fontSize: Typography.size.base, fontWeight: '800', letterSpacing: 1 },
});
