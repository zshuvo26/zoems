import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { marketApi } from '../../api';
import { quickSignalFromInstrument, type QuickSignal, type SignalType } from '../../utils/technicalAnalysis';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatPrice, formatChangePct } from '../../utils/formatters';
import type { Instrument } from '../../types/api';

type ExchangeFilter = 'ALL' | 'DSE' | 'CSE';
type SignalFilter   = 'ALL' | 'BUY' | 'SELL';

interface InstrumentWithSignal {
  instrument: Instrument;
  signal: QuickSignal;
}

function signalColor(s: SignalType): string {
  if (s === 'STRONG_BUY')  return '#00D09C';
  if (s === 'BUY')         return '#3D7FFF';
  if (s === 'SELL')        return '#FF4B4B';
  if (s === 'STRONG_SELL') return '#FF4B4B';
  return '#555E70';
}

function SignalBadge({ signal }: { signal: SignalType }) {
  const color = signalColor(signal);
  const label = signal.replace('_', ' ');
  const isBold = signal === 'STRONG_BUY' || signal === 'STRONG_SELL';
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '66' }]}>
      <Text style={[styles.badgeText, { color, fontWeight: isBold ? '900' : '700' }]}>{label}</Text>
    </View>
  );
}

export default function AIInsightsScreen() {
  const navigation = useNavigation<any>();
  const [exchange, setExchange]   = useState<ExchangeFilter>('ALL');
  const [sigFilter, setSigFilter] = useState<SignalFilter>('ALL');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['ai-instruments', exchange],
    queryFn:  () => marketApi.instruments({
      exchange: exchange === 'ALL' ? undefined : exchange,
      size: 50, page: 0,
    }),
    staleTime: 60_000,
  });

  const instruments: Instrument[] = data?.content ?? [];

  const withSignals: InstrumentWithSignal[] = instruments
    .map(inst => ({ instrument: inst, signal: quickSignalFromInstrument(inst) }))
    .filter(({ signal }) => {
      if (sigFilter === 'BUY')  return signal.signal === 'BUY' || signal.signal === 'STRONG_BUY';
      if (sigFilter === 'SELL') return signal.signal === 'SELL' || signal.signal === 'STRONG_SELL';
      return true;
    })
    .sort((a, b) => Math.abs(b.signal.score) - Math.abs(a.signal.score));

  const onPress = (inst: Instrument) => {
    navigation.navigate('Market', {
      screen: 'InstrumentDetail',
      params: { symbol: inst.symbol, exchange: inst.exchange },
    });
  };

  const renderItem = ({ item }: { item: InstrumentWithSignal }) => {
    const { instrument: inst, signal } = item;
    const scoreAbs = Math.abs(signal.score);
    const fillColor = signal.score >= 0 ? '#00D09C' : '#FF4B4B';
    const dayPct = inst.changePct ?? 0;

    return (
      <TouchableOpacity style={styles.row} onPress={() => onPress(inst)} activeOpacity={0.75}>
        <View style={styles.rowLeft}>
          <Text style={styles.symbol}>{inst.symbol}</Text>
          <Text style={styles.name} numberOfLines={1}>{inst.name ?? inst.shortName ?? ''}</Text>
          <Text style={styles.insight} numberOfLines={1}>{signal.insight}</Text>
        </View>

        <View style={styles.rowRight}>
          <SignalBadge signal={signal.signal} />
          <View style={styles.scoreBar}>
            <View style={[styles.scoreFill, { width: `${scoreAbs}%`, backgroundColor: fillColor }]} />
          </View>
          <Text style={[styles.confidence, { color: signalColor(signal.signal) }]}>
            {signal.confidence}% conf
          </Text>
          <Text style={styles.price}>{formatPrice(inst.lastPrice)}</Text>
          <Text style={[styles.pct, { color: dayPct >= 0 ? '#00D09C' : '#FF4B4B' }]}>
            {dayPct >= 0 ? '+' : ''}{dayPct.toFixed(2)}%
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="sparkles" size={18} color="#9B8CF2" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>AI Market Intelligence</Text>
          <Text style={styles.headerSub}>Technical signals — {withSignals.length} instruments analysed</Text>
        </View>
        <TouchableOpacity onPress={() => refetch()} style={styles.refetchBtn} disabled={isRefetching}>
          <Ionicons name="refresh" size={18} color={isRefetching ? Colors.text.muted : Colors.accent.blue} />
        </TouchableOpacity>
      </View>

      {/* Exchange filter */}
      <View style={styles.filterRow}>
        {(['ALL', 'DSE', 'CSE'] as ExchangeFilter[]).map(ex => (
          <TouchableOpacity
            key={ex}
            style={[styles.chip, exchange === ex && styles.chipActive]}
            onPress={() => setExchange(ex)}
          >
            <Text style={[styles.chipText, exchange === ex && styles.chipTextActive]}>{ex}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.filterSep} />
        {(['ALL', 'BUY', 'SELL'] as SignalFilter[]).map(sf => (
          <TouchableOpacity
            key={sf}
            style={[styles.chip, sigFilter === sf && styles.chipActive]}
            onPress={() => setSigFilter(sf)}
          >
            <Text style={[styles.chipText, sigFilter === sf && styles.chipTextActive]}>
              {sf === 'BUY' ? 'Buy Signals' : sf === 'SELL' ? 'Sell Signals' : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Column headers */}
      <View style={styles.colHeader}>
        <Text style={[styles.colLabel, { flex: 1 }]}>INSTRUMENT</Text>
        <Text style={[styles.colLabel, { width: 100, textAlign: 'right' }]}>SIGNAL / SCORE</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent.blue} size="large" />
          <Text style={styles.loadingText}>Analysing market signals…</Text>
        </View>
      ) : (
        <FlatList
          data={withSignals}
          keyExtractor={item => item.instrument.symbol}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="analytics-outline" size={48} color={Colors.text.muted} />
              <Text style={styles.emptyText}>No signals match your filter</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.base, backgroundColor: Colors.bg.secondary,
    borderBottomWidth: 1, borderBottomColor: Colors.border.subtle,
  },
  headerIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#9B8CF2' + '22', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '800' },
  headerSub:   { color: Colors.text.muted, fontSize: 11, marginTop: 2 },
  refetchBtn:  { padding: 6 },

  filterRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    backgroundColor: Colors.bg.secondary,
    borderBottomWidth: 1, borderBottomColor: Colors.border.subtle,
    flexWrap: 'wrap',
  },
  filterSep: { width: 1, height: 16, backgroundColor: Colors.border.default, marginHorizontal: 4 },
  chip:          { borderWidth: 1, borderColor: Colors.border.default, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4, backgroundColor: Colors.bg.tertiary },
  chipActive:    { borderColor: Colors.accent.blue, backgroundColor: Colors.accent.blue + '22' },
  chipText:      { color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '700' },
  chipTextActive:{ color: Colors.accent.blue },

  colHeader: {
    flexDirection: 'row', paddingHorizontal: Spacing.base, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: Colors.border.subtle,
  },
  colLabel: { color: Colors.text.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    backgroundColor: Colors.bg.primary,
  },
  rowLeft:  { flex: 1, gap: 3 },
  rowRight: { width: 110, alignItems: 'flex-end', gap: 4 },

  symbol:     { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '800', fontFamily: 'monospace' },
  name:       { color: Colors.text.muted, fontSize: 10 },
  insight:    { color: Colors.text.secondary, fontSize: 10 },

  badge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { fontSize: 9, letterSpacing: 0.3 },

  scoreBar: {
    width: 80, height: 3, backgroundColor: Colors.border.default,
    borderRadius: 2, overflow: 'hidden',
  },
  scoreFill: { height: '100%', borderRadius: 2 },

  confidence: { fontSize: 9, fontWeight: '700' },
  price:      { color: Colors.text.primary, fontSize: Typography.size.xs, fontWeight: '700', fontFamily: 'monospace' },
  pct:        { fontSize: 10, fontWeight: '700' },

  sep:  { height: 1, backgroundColor: Colors.border.subtle, marginLeft: Spacing.base },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'], gap: Spacing.base },
  loadingText: { color: Colors.text.muted, fontSize: Typography.size.sm, marginTop: Spacing.sm },
  emptyText:   { color: Colors.text.muted, fontSize: Typography.size.sm, textAlign: 'center' },
});
