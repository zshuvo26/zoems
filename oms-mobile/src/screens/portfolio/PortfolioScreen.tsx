import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { portfolioApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { LoadingView, ErrorView, Card, SectionHeader } from '../../components/common';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatBDT, formatChangePct, formatChange, changeColor, formatCompact } from '../../utils/formatters';
import type { Position } from '../../types/api';

export default function PortfolioScreen() {
  const nav           = useNavigation<any>();
  const { accountId } = useAuthStore();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey:        ['portfolio', accountId],
    queryFn:         () => accountId ? portfolioApi.summary(accountId) : null,
    enabled:         !!accountId,
    refetchInterval: 15_000,
  });

  if (isLoading) return <LoadingView message="Loading portfolio…" />;
  if (isError || !data) return <ErrorView onRetry={refetch} />;

  const dayColor   = changeColor(data.dayPnl);
  const totalColor = changeColor(data.totalPnl);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.accent.blue} />}
    >
      {/* Summary Card */}
      <Card elevated style={styles.summaryCard}>
        <Text style={styles.cardLabel}>TOTAL PORTFOLIO VALUE</Text>
        <Text style={styles.totalValue}>{formatBDT(data.portfolioValue)}</Text>

        <View style={styles.metricsGrid}>
          <MetricBox label="Day P&L"  value={formatChange(data.dayPnl)} sub={formatChangePct(data.dayPnlPct)} color={dayColor} />
          <MetricBox label="Total P&L" value={formatChange(data.totalPnl)} sub={formatChangePct(data.totalPnlPct)} color={totalColor} />
          <MetricBox label="Cash"       value={formatCompact(data.cashBalance)} sub="Available" color={Colors.text.primary} />
          <MetricBox label="Invested"   value={formatCompact(data.portfolioValue - data.cashBalance)} sub="Positions" color={Colors.accent.blue} />
        </View>
      </Card>

      {/* Quick Actions */}
      <View style={styles.actions}>
        <ActionBtn icon="analytics-outline" label="Performance" onPress={() => nav.navigate('Performance')} />
        <ActionBtn icon="stats-chart-outline" label="TCA Analysis" onPress={() => nav.navigate('Tca')} />
        <ActionBtn icon="shield-checkmark-outline" label="Margin" onPress={() => nav.navigate('More', { screen: 'Margin' })} />
      </View>

      {/* Positions */}
      <SectionHeader title={`Positions (${data.positions?.length ?? 0})`} />

      {(!data.positions || data.positions.length === 0) ? (
        <View style={styles.empty}>
          <Ionicons name="pie-chart-outline" size={40} color={Colors.text.muted} />
          <Text style={styles.emptyText}>No positions yet</Text>
        </View>
      ) : (
        data.positions.map((pos: Position) => (
          <PositionCard key={`${pos.symbol}-${pos.exchange}`} pos={pos} />
        ))
      )}
    </ScrollView>
  );
}

function MetricBox({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricSub}>{sub}</Text>
    </View>
  );
}

function ActionBtn({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color={Colors.accent.blue} />
      <Text style={styles.actionBtnLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function PositionCard({ pos }: { pos: Position }) {
  const pnlColor  = changeColor(pos.totalPnL ?? 0);
  const fillPct   = Math.min(Math.max((pos.totalPnLPct ?? 0) / 20 * 50 + 50, 0), 100);

  return (
    <View style={styles.posCard}>
      <View style={styles.posHeader}>
        <View>
          <Text style={styles.posSymbol}>{pos.symbol}</Text>
          <Text style={styles.posExchange}>{pos.exchange} · {pos.netQuantity?.toLocaleString()} shares</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.posValue}>{formatBDT(pos.marketValue)}</Text>
          <Text style={[styles.posPnl, { color: pnlColor }]}>
            {formatChange(pos.totalPnL ?? 0)} ({formatChangePct(pos.totalPnLPct ?? 0)})
          </Text>
        </View>
      </View>
      <View style={styles.posDetails}>
        <View style={styles.posDetail}>
          <Text style={styles.posDetailLabel}>Avg Cost</Text>
          <Text style={styles.posDetailValue}>{formatBDT(pos.avgCostPrice)}</Text>
        </View>
        <View style={styles.posDetail}>
          <Text style={styles.posDetailLabel}>CMP</Text>
          <Text style={[styles.posDetailValue, { color: pnlColor }]}>{formatBDT(pos.currentMarketPrice)}</Text>
        </View>
        <View style={styles.posDetail}>
          <Text style={styles.posDetailLabel}>Day P&L</Text>
          <Text style={[styles.posDetailValue, { color: changeColor(pos.dayPnL ?? 0) }]}>
            {formatChange(pos.dayPnL ?? 0)}
          </Text>
        </View>
      </View>
      {/* PnL bar */}
      <View style={styles.pnlBar}>
        <View style={[styles.pnlBarFill, { width: `${fillPct}%`, backgroundColor: pnlColor }]} />
        <View style={styles.pnlBarCenter} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing.base, gap: Spacing.sm, paddingBottom: Spacing['2xl'] },

  summaryCard: { gap: Spacing.sm },
  cardLabel:   { color: Colors.text.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  totalValue:  { color: Colors.text.primary, fontSize: 32, fontWeight: '800', fontFamily: 'monospace' },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  metricBox:   { width: '50%', paddingVertical: Spacing.sm, paddingRight: Spacing.sm },
  metricLabel: { color: Colors.text.muted, fontSize: 10 },
  metricValue: { fontSize: Typography.size.base, fontWeight: '700', fontFamily: 'monospace', marginTop: 2 },
  metricSub:   { color: Colors.text.muted, fontSize: 10, marginTop: 1 },

  actions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    flex: 1,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.xs,
    backgroundColor: Colors.bg.secondary,
    borderRadius:    BorderRadius.md,
    borderWidth:     1,
    borderColor:     Colors.border.subtle,
    padding:         Spacing.sm,
  },
  actionBtnLabel: { color: Colors.accent.blue, fontSize: Typography.size.xs, fontWeight: '600', flex: 1 },

  empty:     { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing['2xl'] },
  emptyText: { color: Colors.text.muted, fontSize: Typography.size.base },

  posCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius:    BorderRadius.lg,
    borderWidth:     1,
    borderColor:     Colors.border.subtle,
    padding:         Spacing.base,
    gap:             Spacing.sm,
  },
  posHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  posSymbol:   { color: Colors.text.primary, fontSize: Typography.size.md, fontWeight: '800' },
  posExchange: { color: Colors.text.muted, fontSize: Typography.size.xs, marginTop: 2 },
  posValue:    { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '700', fontFamily: 'monospace' },
  posPnl:      { fontSize: Typography.size.xs, fontWeight: '700' },

  posDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  posDetail:  {},
  posDetailLabel:{ color: Colors.text.muted, fontSize: 10 },
  posDetailValue:{ color: Colors.text.primary, fontSize: Typography.size.xs, fontWeight: '700' },

  pnlBar:      { height: 3, backgroundColor: Colors.border.default, borderRadius: 2, position: 'relative' },
  pnlBarFill:  { position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 2 },
  pnlBarCenter:{ position: 'absolute', left: '50%', top: -2, width: 2, height: 7, backgroundColor: Colors.border.default },
});
