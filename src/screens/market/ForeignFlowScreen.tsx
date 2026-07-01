import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { foreignFlowApi } from '../../api';
import { LoadingView, ErrorView } from '../../components/common';
import { formatBDT } from '../../utils/formatters';
import { BarChart } from 'react-native-gifted-charts';
import { Dimensions } from 'react-native';

const W = Dimensions.get('window').width;

export default function ForeignFlowScreen() {
  const [exchange, setExchange] = useState<'DSE' | 'CSE'>('DSE');

  const { data: today, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['foreignFlow', exchange],
    queryFn:  () => foreignFlowApi.today(exchange),
    refetchInterval: 60_000,
  });

  const { data: history } = useQuery({
    queryKey: ['foreignFlowHistory', exchange],
    queryFn:  () => foreignFlowApi.history(exchange, 14),
    refetchInterval: 300_000,
  });

  if (isLoading) return <LoadingView message="Loading foreign flow data…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  const isNetBuyer = today?.netBuyer;
  const netColor   = isNetBuyer ? Colors.bull : Colors.bear;

  // Build bar chart data for last 14 days
  const barData = (history ?? []).map((d: any) => ({
    value:     Math.abs(d.netFlow) / 1_000_000,
    label:     d.date.slice(5), // MM-DD
    frontColor: d.netFlow >= 0 ? Colors.bull + 'CC' : Colors.bear + 'CC',
  }));

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.accent.blue} />}>

      {/* Exchange toggle */}
      <View style={styles.exchRow}>
        {(['DSE','CSE'] as const).map(ex => (
          <TouchableOpacity key={ex} style={[styles.exchTab, exchange === ex && styles.exchTabActive]}
            onPress={() => setExchange(ex)}>
            <Text style={[styles.exchText, exchange === ex && styles.exchTextActive]}>{ex}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={[styles.netBadge, { backgroundColor: netColor + '22' }]}>
            <Ionicons name={isNetBuyer ? 'trending-up' : 'trending-down'} size={16} color={netColor} />
            <Text style={[styles.netLabel, { color: netColor }]}>
              Foreign Net {isNetBuyer ? 'Buyer' : 'Seller'}
            </Text>
          </View>
          <Text style={styles.dateText}>{today?.date}</Text>
        </View>
        <Text style={[styles.netAmount, { color: netColor }]}>
          {isNetBuyer ? '+' : ''}{formatBDT(today?.netFlow)}
        </Text>
        <Text style={styles.netSub}>Net foreign flow today</Text>

        <View style={styles.flowRow}>
          <View style={styles.flowItem}>
            <Text style={styles.flowLabel}>Foreign Buy</Text>
            <Text style={[styles.flowAmount, { color: Colors.bull }]}>{formatBDT(today?.foreignBuy)}</Text>
          </View>
          <View style={styles.flowDivider} />
          <View style={styles.flowItem}>
            <Text style={styles.flowLabel}>Foreign Sell</Text>
            <Text style={[styles.flowAmount, { color: Colors.bear }]}>{formatBDT(today?.foreignSell)}</Text>
          </View>
          <View style={styles.flowDivider} />
          <View style={styles.flowItem}>
            <Text style={styles.flowLabel}>FDR %</Text>
            <Text style={styles.flowAmount}>{today?.fdr?.toFixed(2)}%</Text>
          </View>
        </View>

        <View style={styles.turnoverRow}>
          <Text style={styles.turnoverLabel}>Market Turnover</Text>
          <Text style={styles.turnoverValue}>{formatBDT(today?.marketTurnover)}</Text>
        </View>
      </View>

      {/* 14-day net flow chart */}
      {barData.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>14-Day Net Foreign Flow (Crore BDT)</Text>
          <BarChart
            data={barData}
            width={W - Spacing.base * 4}
            height={140}
            barWidth={18}
            spacing={4}
            noOfSections={4}
            yAxisTextStyle={{ color: Colors.text.muted, fontSize: 9 }}
            xAxisLabelTextStyle={{ color: Colors.text.muted, fontSize: 8 }}
            hideRules={false}
            rulesColor={Colors.border.subtle}
            hideYAxisText={false}
            backgroundColor={Colors.bg.secondary}
            xAxisColor={Colors.border.default}
            yAxisColor={Colors.border.default}
          />
        </View>
      )}

      {/* Top bought */}
      <View style={styles.tableCard}>
        <Text style={styles.tableTitle}>Top Foreign Buys Today</Text>
        {(today?.topBought ?? []).map((item: any, i: number) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.tableRank}>{i + 1}</Text>
            <Text style={styles.tableSymbol}>{item.symbol}</Text>
            <View style={styles.tableBadge}><Text style={[styles.tableBadgeText, { color: Colors.bull }]}>BUY</Text></View>
            <Text style={[styles.tableValue, { color: Colors.bull }]}>{formatBDT(item.value)}</Text>
          </View>
        ))}
      </View>

      {/* Top sold */}
      <View style={styles.tableCard}>
        <Text style={styles.tableTitle}>Top Foreign Sells Today</Text>
        {(today?.topSold ?? []).map((item: any, i: number) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.tableRank}>{i + 1}</Text>
            <Text style={styles.tableSymbol}>{item.symbol}</Text>
            <View style={styles.tableBadge}><Text style={[styles.tableBadgeText, { color: Colors.bear }]}>SELL</Text></View>
            <Text style={[styles.tableValue, { color: Colors.bear }]}>{formatBDT(item.value)}</Text>
          </View>
        ))}
      </View>

      {/* Info note */}
      <View style={styles.noteBox}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.text.muted} />
        <Text style={styles.noteText}>
          FDR (Foreign Dominance Ratio) measures foreign trading participation as % of total turnover. Above 8% indicates strong foreign interest.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  exchRow: { flexDirection: 'row', backgroundColor: Colors.bg.secondary, borderBottomWidth: 1, borderBottomColor: Colors.border.subtle },
  exchTab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center' },
  exchTabActive: { borderBottomWidth: 2, borderBottomColor: Colors.accent.blue },
  exchText: { color: Colors.text.muted, fontSize: Typography.size.sm, fontWeight: '600' },
  exchTextActive: { color: Colors.accent.blue },

  summaryCard: {
    margin: Spacing.base, backgroundColor: Colors.bg.secondary,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border.subtle,
    padding: Spacing.base, gap: Spacing.sm,
  },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  netLabel:   { fontSize: Typography.size.sm, fontWeight: '700' },
  dateText:   { color: Colors.text.muted, fontSize: Typography.size.xs },
  netAmount:  { fontSize: 28, fontWeight: '800', fontFamily: 'monospace' },
  netSub:     { color: Colors.text.muted, fontSize: Typography.size.xs },

  flowRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg.tertiary, borderRadius: BorderRadius.md, padding: Spacing.sm },
  flowItem:    { flex: 1, alignItems: 'center', gap: 2 },
  flowDivider: { width: 1, height: 30, backgroundColor: Colors.border.subtle },
  flowLabel:   { color: Colors.text.muted, fontSize: 10, fontWeight: '600' },
  flowAmount:  { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '800', fontFamily: 'monospace' },

  turnoverRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border.subtle, paddingTop: Spacing.xs },
  turnoverLabel: { color: Colors.text.muted, fontSize: Typography.size.xs },
  turnoverValue: { color: Colors.text.secondary, fontSize: Typography.size.sm, fontWeight: '700', fontFamily: 'monospace' },

  chartCard: {
    marginHorizontal: Spacing.base, backgroundColor: Colors.bg.secondary,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border.subtle,
    padding: Spacing.base, marginBottom: Spacing.base,
  },
  chartTitle: { color: Colors.text.secondary, fontSize: Typography.size.sm, fontWeight: '700', marginBottom: Spacing.sm },

  tableCard: {
    marginHorizontal: Spacing.base, backgroundColor: Colors.bg.secondary,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border.subtle,
    padding: Spacing.base, marginBottom: Spacing.sm, gap: Spacing.xs,
  },
  tableTitle: { color: Colors.text.secondary, fontSize: Typography.size.sm, fontWeight: '700', marginBottom: Spacing.xs },
  tableRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  tableRank:  { color: Colors.text.muted, fontSize: 11, width: 16, textAlign: 'right' },
  tableSymbol:{ color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700', flex: 1 },
  tableBadge: { borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  tableBadgeText: { fontSize: 9, fontWeight: '800' },
  tableValue: { fontSize: Typography.size.sm, fontWeight: '700', fontFamily: 'monospace' },

  noteBox: {
    flexDirection: 'row', gap: Spacing.xs, margin: Spacing.base,
    backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border.subtle, padding: Spacing.sm,
  },
  noteText: { color: Colors.text.muted, fontSize: 11, flex: 1, lineHeight: 16 },
});
