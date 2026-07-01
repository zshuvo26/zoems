import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { marketApi } from '../../api';
import { LoadingView, ErrorView } from '../../components/common';
import { formatPrice, formatChangePct } from '../../utils/formatters';
import type { Instrument } from '../../types/api';

const LIMIT = 10; // ±10% circuit breaker in DSE/CSE

export default function CircuitBreakerScreen() {
  const nav = useNavigation<any>();
  const [exchange, setExchange] = useState<'DSE' | 'CSE'>('DSE');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['instruments', exchange],
    queryFn:  () => marketApi.instruments({ exchange, size: 300 }),
    refetchInterval: 15_000,
  });

  const instruments = data?.content ?? [];

  // Near upper circuit
  const upperRisk = instruments
    .filter((i: Instrument) => (i.changePct ?? 0) >= 7)
    .sort((a: Instrument, b: Instrument) => (b.changePct ?? 0) - (a.changePct ?? 0));

  // Near lower circuit
  const lowerRisk = instruments
    .filter((i: Instrument) => (i.changePct ?? 0) <= -7)
    .sort((a: Instrument, b: Instrument) => (a.changePct ?? 0) - (b.changePct ?? 0));

  // Already halted
  const halted = instruments.filter((i: Instrument) => i.halted);

  if (isLoading) return <LoadingView message="Loading circuit breaker data…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  const renderInst = (item: Instrument, variant: 'upper' | 'lower') => {
    const pct   = item.changePct ?? 0;
    const color = variant === 'upper' ? Colors.bull : Colors.bear;
    const dist  = variant === 'upper' ? LIMIT - pct : LIMIT + pct;
    const pctToLimit = Math.max(0, dist);
    const barW  = Math.min(100, ((LIMIT - pctToLimit) / LIMIT) * 100);
    return (
      <TouchableOpacity style={styles.row} activeOpacity={0.7}
        onPress={() => nav.navigate('InstrumentDetail', { symbol: item.symbol, exchange: item.exchange })}>
        <View style={styles.rowLeft}>
          <View style={[styles.symbolBox, { backgroundColor: color + '18' }]}>
            <Text style={[styles.symbolText, { color }]}>{item.symbol.slice(0, 2)}</Text>
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowSymbol}>{item.symbol}</Text>
            <View style={styles.barOuter}>
              <View style={[styles.barInner, { width: `${barW}%` as any, backgroundColor: color }]} />
            </View>
            <Text style={[styles.distText, { color }]}>
              {pctToLimit.toFixed(1)}% to {variant === 'upper' ? 'upper' : 'lower'} circuit
            </Text>
          </View>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.rowPrice}>{formatPrice(item.lastPrice)}</Text>
          <View style={[styles.pill, { backgroundColor: color + '22' }]}>
            <Text style={[styles.pillText, { color }]}>{formatChangePct(pct)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      {/* Exchange toggle */}
      <View style={styles.exchRow}>
        {(['DSE','CSE'] as const).map(ex => (
          <TouchableOpacity key={ex} style={[styles.exchTab, exchange === ex && styles.exchTabActive]}
            onPress={() => setExchange(ex)}>
            <Text style={[styles.exchText, exchange === ex && styles.exchTextActive]}>{ex}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Warning banner */}
      <View style={styles.banner}>
        <Ionicons name="warning" size={14} color={Colors.status.warning} />
        <Text style={styles.bannerText}>
          DSE/CSE ±10% daily circuit breaker. Shown: instruments ≥7% movement today.
        </Text>
      </View>

      <FlatList
        data={[]}
        keyExtractor={() => ''}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.accent.blue} />}
        ListHeaderComponent={
          <>
            {/* Upper circuit risk */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="arrow-up-circle" size={16} color={Colors.bull} />
                <Text style={styles.sectionTitle}>NEAR UPPER CIRCUIT ({upperRisk.length})</Text>
              </View>
              {upperRisk.length === 0
                ? <Text style={styles.noneText}>No instruments near upper limit</Text>
                : upperRisk.map((i: Instrument) => <View key={i.symbol}>{renderInst(i, 'upper')}<View style={styles.sep}/></View>)
              }
            </View>

            {/* Lower circuit risk */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="arrow-down-circle" size={16} color={Colors.bear} />
                <Text style={styles.sectionTitle}>NEAR LOWER CIRCUIT ({lowerRisk.length})</Text>
              </View>
              {lowerRisk.length === 0
                ? <Text style={styles.noneText}>No instruments near lower limit</Text>
                : lowerRisk.map((i: Instrument) => <View key={i.symbol}>{renderInst(i, 'lower')}<View style={styles.sep}/></View>)
              }
            </View>

            {/* Halted */}
            {halted.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="stop-circle" size={16} color={Colors.text.muted} />
                  <Text style={styles.sectionTitle}>TRADING HALTED ({halted.length})</Text>
                </View>
                {halted.map((i: Instrument) => (
                  <TouchableOpacity key={i.symbol} style={styles.haltedRow} activeOpacity={0.7}
                    onPress={() => nav.navigate('InstrumentDetail', { symbol: i.symbol, exchange: i.exchange })}>
                    <Text style={styles.haltedSymbol}>{i.symbol}</Text>
                    <View style={styles.haltBadge}><Text style={styles.haltBadgeText}>HALT</Text></View>
                    <Text style={styles.haltPrice}>{formatPrice(i.lastPrice)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        }
        renderItem={() => null}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  exchRow: { flexDirection: 'row', backgroundColor: Colors.bg.secondary, borderBottomWidth: 1, borderBottomColor: Colors.border.subtle },
  exchTab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center' },
  exchTabActive: { borderBottomWidth: 2, borderBottomColor: Colors.accent.blue },
  exchText: { color: Colors.text.muted, fontSize: Typography.size.sm, fontWeight: '600' },
  exchTextActive: { color: Colors.accent.blue },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.status.warning + '15',
    borderLeftWidth: 3, borderLeftColor: Colors.status.warning,
    padding: Spacing.sm,
  },
  bannerText: { color: Colors.text.secondary, fontSize: 11, flex: 1 },

  section:       { padding: Spacing.base, gap: Spacing.xs },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 4 },
  sectionTitle:  { color: Colors.text.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  noneText:      { color: Colors.text.muted, fontSize: Typography.size.xs, paddingVertical: Spacing.sm, paddingLeft: Spacing.sm },
  sep:           { height: 1, backgroundColor: Colors.border.subtle },

  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  rowLeft:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  symbolBox:{ width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  symbolText:{ fontSize: 11, fontWeight: '800' },
  rowInfo:  { flex: 1, gap: 3 },
  rowSymbol:{ color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700' },
  barOuter: { height: 4, backgroundColor: Colors.bg.tertiary, borderRadius: 2, overflow: 'hidden', width: '90%' },
  barInner: { height: 4, borderRadius: 2 },
  distText: { fontSize: 10, fontWeight: '600' },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  rowPrice: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700', fontFamily: 'monospace' },
  pill:     { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  pillText: { fontSize: Typography.size.xs, fontWeight: '700' },

  haltedRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  haltedSymbol: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700', flex: 1 },
  haltBadge:    { backgroundColor: Colors.bear + '22', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  haltBadgeText:{ color: Colors.bear, fontSize: 9, fontWeight: '800' },
  haltPrice:    { color: Colors.text.secondary, fontSize: Typography.size.sm, fontFamily: 'monospace' },
});
