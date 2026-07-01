import React from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { accountsApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { LoadingView, ErrorView, Card, StatRow } from '../../components/common';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatBDT, formatChangePct } from '../../utils/formatters';
import type { MarginStatus } from '../../types/api';

function GaugeBar({ used, total, label, color }: { used: number; total: number; label: string; color: string }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const barColor = pct > 90 ? Colors.bear : pct > 70 ? Colors.status.warning : Colors.bull;
  return (
    <View style={gauge.wrap}>
      <View style={gauge.labelRow}>
        <Text style={gauge.label}>{label}</Text>
        <Text style={[gauge.pct, { color: barColor }]}>{pct.toFixed(1)}%</Text>
      </View>
      <View style={gauge.track}>
        <View style={[gauge.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <View style={gauge.valRow}>
        <Text style={gauge.used}>{formatBDT(used)}</Text>
        <Text style={gauge.total}>of {formatBDT(total)}</Text>
      </View>
    </View>
  );
}

const gauge = StyleSheet.create({
  wrap:     { gap: 4, marginBottom: Spacing.sm },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label:    { color: Colors.text.secondary, fontSize: Typography.size.xs, fontWeight: '600' },
  pct:      { fontSize: Typography.size.xs, fontWeight: '800' },
  track:    { height: 10, backgroundColor: Colors.border.default, borderRadius: 5 },
  fill:     { height: '100%', borderRadius: 5 },
  valRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  used:     { color: Colors.text.primary, fontSize: 10, fontWeight: '700' },
  total:    { color: Colors.text.muted, fontSize: 10 },
});

export default function MarginScreen() {
  const { accountId } = useAuthStore();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey:        ['margin', accountId],
    queryFn:         () => accountId ? accountsApi.margin(accountId) : null,
    enabled:         !!accountId,
    refetchInterval: 30_000,
  });

  if (isLoading) return <LoadingView message="Loading margin data…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  const margin = data as MarginStatus | null;
  if (!margin) return <ErrorView onRetry={refetch} message="No margin data available" />;

  const marginPct   = margin.marginUtilizationPct ?? 0;
  const statusColor = marginPct > 90 ? Colors.bear : marginPct > 70 ? Colors.status.warning : Colors.bull;
  const statusLabel = marginPct > 90 ? 'MARGIN CALL RISK' : marginPct > 70 ? 'HIGH USAGE' : 'NORMAL';
  const marginUsed  = margin.usedMargin ?? 0;
  const marginFree  = margin.availableMargin ?? 0;
  const marginLimit = margin.marginLimit ?? 1;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.accent.blue} />}
    >
      {/* Status banner */}
      <View style={[styles.statusBanner, { borderLeftColor: statusColor }]}>
        <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
        <Text style={styles.statusSub}>
          {marginPct > 90
            ? 'Deposit funds or close positions to avoid forced liquidation'
            : marginPct > 70
            ? 'Monitor positions — approaching margin threshold'
            : 'Margin usage is within safe limits'}
        </Text>
      </View>

      {/* Key metrics */}
      <Card elevated>
        <Text style={styles.cardTitle}>Account Summary</Text>
        <StatRow label="Buying Power"    value={formatBDT(margin.buyingPower ?? 0)}    valueColor={Colors.bull} />
        <StatRow label="Cash Balance"    value={formatBDT(margin.cashBalance ?? 0)} />
        <StatRow label="Portfolio Value" value={formatBDT(margin.portfolioValue ?? 0)} />
        <StatRow label="Total Equity"    value={formatBDT(margin.totalEquity ?? 0)} />
        <StatRow label="Margin Call"     value={margin.marginCallActive ? 'YES' : 'NO'} valueColor={margin.marginCallActive ? Colors.bear : Colors.bull} />
      </Card>

      {/* Gauge bars */}
      <Card>
        <Text style={styles.cardTitle}>Margin Utilization</Text>
        <GaugeBar
          used={marginUsed}
          total={marginLimit}
          label="Margin Used / Limit"
          color={statusColor}
        />
      </Card>

      {/* Limit details */}
      <Card>
        <Text style={styles.cardTitle}>Risk Limits</Text>
        <StatRow label="Margin Limit"   value={formatBDT(marginLimit)} />
        <StatRow label="Margin Used"    value={formatBDT(marginUsed)}  valueColor={statusColor} />
        <StatRow label="Margin Free"    value={formatBDT(marginFree)}  valueColor={Colors.bull} />
        <StatRow label="Utilization"    value={`${marginPct.toFixed(2)}%`} valueColor={statusColor} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: Colors.bg.primary },
  scroll:{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 32 },

  statusBanner: {
    borderLeftWidth: 4, paddingLeft: Spacing.sm, paddingVertical: Spacing.sm,
    backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.md, gap: 2,
    borderWidth: 1, borderColor: Colors.border.subtle,
  },
  statusLabel: { fontSize: Typography.size.sm, fontWeight: '800', letterSpacing: 0.5 },
  statusSub:   { color: Colors.text.muted, fontSize: Typography.size.xs, lineHeight: 16 },

  cardTitle: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '800', marginBottom: Spacing.sm },
});
