import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { portfolioApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { LoadingView, ErrorView, Card, StatRow } from '../../components/common';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { changeColor, formatChangePct } from '../../utils/formatters';

const PERIODS = ['1D', '1W', '1M', '3M', 'YTD', '1Y'] as const;
type Period = typeof PERIODS[number];

const BENCHMARK: Record<Period, number> = {
  '1D': 0.12, '1W': 0.45, '1M': 1.20, '3M': 3.50, 'YTD': 8.20, '1Y': 12.50,
};

export default function PerformanceScreen() {
  const { accountId } = useAuthStore();
  const [period, setPeriod] = useState<Period>('1M');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['performance', accountId, period],
    queryFn:  () => accountId ? portfolioApi.performance(accountId, period) : null,
    enabled:  !!accountId,
  });

  if (isLoading) return <LoadingView message="Calculating performance…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  const benchmark   = data?.benchmarkReturnPct ?? BENCHMARK[period];
  const portfolio   = data?.portfolioReturnPct ?? 0;
  const alpha       = data?.alphaPct ?? (portfolio - benchmark);
  const alphaColor  = changeColor(alpha);
  const portColor   = changeColor(portfolio);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Period Selector */}
      <View style={styles.periodRow}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Alpha Card */}
      <Card elevated style={styles.alphaCard}>
        <Text style={styles.alphaLabel}>ALPHA vs DSEX {period}</Text>
        <Text style={[styles.alphaValue, { color: alphaColor }]}>
          {alpha > 0 ? '+' : ''}{alpha.toFixed(2)}%
        </Text>
        <Text style={styles.alphaDesc}>
          {alpha > 0
            ? `Outperforming DSEX by ${alpha.toFixed(2)}%`
            : `Underperforming DSEX by ${Math.abs(alpha).toFixed(2)}%`}
        </Text>
      </Card>

      {/* Comparison Chart (visual bar) */}
      <Card style={styles.compChart}>
        <Text style={styles.sectionTitle}>Return Comparison</Text>
        <BarRow label="Portfolio" value={portfolio} color={portColor} max={Math.max(Math.abs(portfolio), Math.abs(benchmark), 1)} />
        <BarRow label={`DSEX ${period}`} value={benchmark} color={Colors.accent.blue} max={Math.max(Math.abs(portfolio), Math.abs(benchmark), 1)} />
      </Card>

      {/* Stats */}
      <Card style={{ gap: 2 }}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <StatRow label="Portfolio Return" value={formatChangePct(portfolio)} valueColor={portColor} />
        <StatRow label="DSEX Benchmark"   value={formatChangePct(benchmark)} valueColor={Colors.accent.blue} />
        <StatRow label="Alpha (excess)"   value={formatChangePct(alpha)} valueColor={alphaColor} />
      </Card>

      {/* Top Contributors */}
      {data?.topContributors && data.topContributors.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>Top Contributors</Text>
          {data.topContributors.map((c, i) => (
            <View key={i} style={styles.contributorRow}>
              <Text style={styles.contributorSymbol}>{c.symbol}</Text>
              <Text style={[styles.contributorPct, { color: changeColor(c.contributionPct) }]}>
                {formatChangePct(c.contributionPct)}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {/* Sector Allocation */}
      {data?.sectorAllocations && data.sectorAllocations.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>Sector Allocation</Text>
          {data.sectorAllocations.map((s, i) => (
            <View key={i} style={styles.sectorRow}>
              <Text style={styles.sectorName}>{s.sector}</Text>
              <Text style={styles.sectorAlloc}>{s.allocationPct?.toFixed(1)}%</Text>
              <Text style={[styles.sectorReturn, { color: changeColor(s.returnPct) }]}>
                {formatChangePct(s.returnPct)}
              </Text>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

function BarRow({ label, value, color, max }: { label: string; value: number; color: string; max: number }) {
  const w = Math.abs(value) / max * 100;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${w}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barValue, { color }]}>{formatChangePct(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing.base, gap: Spacing.sm, paddingBottom: 32 },

  periodRow: { flexDirection: 'row', backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border.default },
  periodBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center' },
  periodBtnActive: { backgroundColor: Colors.accent.blue },
  periodText:     { color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '700' },
  periodTextActive: { color: Colors.white },

  alphaCard: { alignItems: 'center', gap: Spacing.xs },
  alphaLabel: { color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '700', letterSpacing: 1 },
  alphaValue: { fontSize: 42, fontWeight: '800', fontFamily: 'monospace' },
  alphaDesc:  { color: Colors.text.secondary, fontSize: Typography.size.sm, textAlign: 'center' },

  compChart: { gap: Spacing.md },
  sectionTitle: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700', marginBottom: Spacing.sm },

  barRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  barLabel: { color: Colors.text.secondary, fontSize: Typography.size.xs, width: 80 },
  barTrack: { flex: 1, height: 8, backgroundColor: Colors.border.default, borderRadius: 4 },
  barFill:  { height: '100%', borderRadius: 4 },
  barValue: { fontSize: Typography.size.xs, fontWeight: '700', width: 50, textAlign: 'right' },

  contributorRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  contributorSymbol: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700' },
  contributorPct:    { fontSize: Typography.size.sm, fontWeight: '700' },

  sectorRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  sectorName:    { color: Colors.text.secondary, fontSize: Typography.size.xs, flex: 2 },
  sectorAlloc:   { color: Colors.text.primary, fontSize: Typography.size.xs, fontWeight: '700', flex: 1, textAlign: 'center' },
  sectorReturn:  { fontSize: Typography.size.xs, fontWeight: '700', flex: 1, textAlign: 'right' },
});
