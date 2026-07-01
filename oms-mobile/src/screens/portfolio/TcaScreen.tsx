import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { portfolioApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { LoadingView, ErrorView, Card, StatRow } from '../../components/common';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatBDT, formatBps, changeColor } from '../../utils/formatters';

export default function TcaScreen() {
  const { accountId } = useAuthStore();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tca', accountId],
    queryFn:  () => accountId ? portfolioApi.tcaAccount(accountId) : [],
    enabled:  !!accountId,
  });

  if (isLoading) return <LoadingView message="Loading TCA data…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  const records = data ?? [];

  return (
    <View style={styles.root}>
      {records.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No TCA data yet</Text>
          <Text style={styles.emptySub}>Fill orders to generate TCA analysis</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={r => r.orderId}
          contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 32 }}
          renderItem={({ item }) => {
            const slipColor  = changeColor(-item.slippageBps);
            const isGoodBps  = item.totalCostBps < 60;
            return (
              <Card>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.symbol}>{item.symbol}</Text>
                    <Text style={styles.side}>{item.side} order</Text>
                  </View>
                  <View style={[styles.costBadge, { borderColor: isGoodBps ? Colors.bull : Colors.bear }]}>
                    <Text style={[styles.costBadgeText, { color: isGoodBps ? Colors.bull : Colors.bear }]}>
                      {formatBps(item.totalCostBps)}
                    </Text>
                    <Text style={[styles.costBadgeSub, { color: isGoodBps ? Colors.bull : Colors.bear }]}>
                      {isGoodBps ? 'GOOD' : 'HIGH COST'}
                    </Text>
                  </View>
                </View>

                <StatRow label="Arrival Price"     value={formatBDT(item.arrivalPrice)} />
                <StatRow label="VWAP Fill"          value={formatBDT(item.vwapFill)} />
                <StatRow label="Slippage"           value={`${formatBDT(item.slippageBdt)} (${formatBps(item.slippageBps)})`} valueColor={slipColor} />
                <StatRow label="Impl. Shortfall"    value={formatBps(item.implementationShortfallBps)} />
                <StatRow label="Market Impact"      value={`${item.marketImpactPct?.toFixed(3)}%`} />
                <StatRow label="Total Cost"         value={`${formatBDT(item.totalCostBdt)} (${formatBps(item.totalCostBps)})`} />

                {/* Quality indicator */}
                <View style={styles.qualityBar}>
                  {[
                    { label: 'Excellent', max: 5,   color: Colors.bull },
                    { label: 'Good',      max: 20,  color: '#8BC34A' },
                    { label: 'Fair',      max: 60,  color: Colors.status.warning },
                    { label: 'Poor',      max: 100, color: Colors.bear },
                  ].map((tier, i) => (
                    <View
                      key={i}
                      style={[styles.qualitySegment, {
                        backgroundColor: item.slippageBps <= tier.max ? tier.color : Colors.border.default,
                        opacity: item.slippageBps <= tier.max ? 1 : 0.3,
                      }]}
                    />
                  ))}
                </View>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: Colors.bg.primary },
  empty:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  emptyText:{ color: Colors.text.secondary, fontSize: Typography.size.base, fontWeight: '700' },
  emptySub: { color: Colors.text.muted, fontSize: Typography.size.sm },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  symbol:     { color: Colors.text.primary, fontSize: Typography.size.md, fontWeight: '800' },
  side:       { color: Colors.text.muted, fontSize: Typography.size.xs },

  costBadge:    { borderWidth: 1, borderRadius: BorderRadius.sm, padding: Spacing.xs, alignItems: 'center' },
  costBadgeText:{ fontSize: Typography.size.base, fontWeight: '800', fontFamily: 'monospace' },
  costBadgeSub: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },

  qualityBar: { flexDirection: 'row', gap: 4, marginTop: Spacing.sm },
  qualitySegment: { flex: 1, height: 6, borderRadius: 3 },
});
