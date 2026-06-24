import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { settlementApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { LoadingView, ErrorView, Card, StatRow } from '../../components/common';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatBDT } from '../../utils/formatters';
import type { SettlementSummary } from '../../types/api';

function SettlementStat({
  icon, label, value, color,
}: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string }) {
  return (
    <View style={stat.wrap}>
      <View style={[stat.iconWrap, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={stat.label}>{label}</Text>
      <Text style={[stat.value, { color }]}>{value}</Text>
    </View>
  );
}

const stat = StyleSheet.create({
  wrap:    { flex: 1, alignItems: 'center', gap: 4 },
  iconWrap:{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  label:   { color: Colors.text.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
  value:   { fontSize: Typography.size.base, fontWeight: '800', fontFamily: 'monospace', textAlign: 'center' },
});

export default function SettlementScreen() {
  const { accountId } = useAuthStore();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['settlement', accountId],
    queryFn:  () => accountId ? settlementApi.summary(accountId) : null,
    enabled:  !!accountId,
  });

  if (isLoading) return <LoadingView message="Loading settlement data…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  const summary = data as SettlementSummary | null;
  if (!summary) return <ErrorView onRetry={refetch} message="No settlement data" />;

  const net = summary.netSettlementAmount ?? 0;
  const netColor = net >= 0 ? Colors.bull : Colors.bear;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.accent.blue} />}
    >
      {/* Net settlement banner */}
      <View style={[styles.netBanner, { borderLeftColor: netColor }]}>
        <Text style={styles.netLabel}>NET SETTLEMENT POSITION</Text>
        <Text style={[styles.netAmount, { color: netColor }]}>
          {net >= 0 ? '+' : ''}{formatBDT(net)}
        </Text>
        <Text style={styles.netSub}>
          {net >= 0
            ? 'You have a net receivable position (T+2)'
            : 'You have a net payable position (T+2)'}
        </Text>
      </View>

      {/* Summary grid */}
      <Card>
        <View style={styles.statGrid}>
          <SettlementStat
            icon="swap-horizontal"
            label="TOTAL TRADES"
            value={String(summary.totalTrades ?? 0)}
            color={Colors.accent.blue}
          />
          <SettlementStat
            icon="checkmark-circle"
            label="SETTLED"
            value={String(summary.settled ?? 0)}
            color={Colors.bull}
          />
          <SettlementStat
            icon="time"
            label="PENDING"
            value={String(summary.pending ?? 0)}
            color={Colors.status.warning}
          />
        </View>
      </Card>

      {/* Payable / Receivable */}
      <Card elevated>
        <Text style={styles.cardTitle}>Cash Flow (T+2)</Text>
        <StatRow
          label="Total Receivable"
          value={formatBDT(summary.totalNetReceivable ?? 0)}
          valueColor={Colors.bull}
        />
        <StatRow
          label="Total Payable"
          value={formatBDT(summary.totalNetPayable ?? 0)}
          valueColor={Colors.bear}
        />
        <View style={styles.netRow}>
          <Text style={styles.netRowLabel}>Net Position</Text>
          <Text style={[styles.netRowValue, { color: netColor }]}>
            {net >= 0 ? '+' : ''}{formatBDT(net)}
          </Text>
        </View>
      </Card>

      {/* Info note */}
      <View style={styles.infoNote}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.accent.blue} />
        <Text style={styles.infoText}>
          Bangladesh DSE/CSE operates on T+2 rolling settlement. Trades executed today settle two business days later.
          Clearing house: CDBL.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing.base, gap: Spacing.sm, paddingBottom: 40 },

  netBanner: {
    borderLeftWidth: 4, paddingLeft: Spacing.sm, paddingVertical: Spacing.base,
    backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.md, gap: 4,
    borderWidth: 1, borderColor: Colors.border.subtle,
  },
  netLabel:  { color: Colors.text.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  netAmount: { fontSize: 36, fontWeight: '800', fontFamily: 'monospace' },
  netSub:    { color: Colors.text.secondary, fontSize: Typography.size.xs },

  statGrid:  { flexDirection: 'row', justifyContent: 'space-around' },

  cardTitle: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '800', marginBottom: Spacing.sm },
  netRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.sm, marginTop: Spacing.xs, borderTopWidth: 1, borderTopColor: Colors.border.default },
  netRowLabel:{ color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700' },
  netRowValue:{ fontSize: Typography.size.base, fontWeight: '800', fontFamily: 'monospace' },

  infoNote: {
    flexDirection: 'row', gap: Spacing.xs, alignItems: 'flex-start',
    backgroundColor: Colors.accent.blue + '11', borderRadius: BorderRadius.md,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border.subtle,
  },
  infoText: { color: Colors.text.secondary, fontSize: Typography.size.xs, flex: 1, lineHeight: 16 },
});
