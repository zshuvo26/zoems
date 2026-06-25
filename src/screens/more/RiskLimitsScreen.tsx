import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { LoadingView, ErrorView, Card, StatRow, SectionHeader } from '../../components/common';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatBDT } from '../../utils/formatters';

export default function RiskLimitsScreen() {
  const { accountId } = useAuthStore();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['riskLimits', accountId],
    queryFn:  () => accountId ? accountsApi.riskLimits(accountId) : null,
    enabled:  !!accountId,
  });

  if (isLoading) return <LoadingView message="Loading risk limits…" />;
  if (isError || !data) return <ErrorView onRetry={refetch} />;

  const limits = [
    { label: 'Max Order Value',    value: formatBDT(data.maxOrderValue),    icon: 'cash-outline',          color: Colors.accent.blue,    desc: 'Maximum value per single order' },
    { label: 'Max Position Value', value: formatBDT(data.maxPositionValue), icon: 'wallet-outline',         color: Colors.accent.purple,  desc: 'Maximum total position in one stock' },
    { label: 'Max Orders/Day',     value: String(data.maxOrdersPerDay),     icon: 'layers-outline',         color: Colors.status.warning, desc: 'Maximum orders allowed per trading day' },
    { label: 'Max Daily Loss',     value: formatBDT(data.maxLossPerDay),    icon: 'trending-down-outline',  color: Colors.bear,           desc: 'Maximum loss allowed before trading is halted' },
    { label: 'Margin Multiplier',  value: `${data.marginMultiplier}×`,      icon: 'options-outline',        color: Colors.bull,           desc: 'Available buying power multiplier' },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="shield-checkmark" size={28} color={Colors.accent.blue} />
        </View>
        <Text style={styles.headerTitle}>Risk Limits</Text>
        <Text style={styles.headerSub}>Account ID: {data.accountId}</Text>
      </View>

      {/* Limit Cards */}
      <SectionHeader title="Trading Limits" />
      {limits.map(l => (
        <View key={l.label} style={styles.limitCard}>
          <View style={[styles.limitIcon, { backgroundColor: l.color + '22' }]}>
            <Ionicons name={l.icon as any} size={22} color={l.color} />
          </View>
          <View style={styles.limitBody}>
            <Text style={styles.limitLabel}>{l.label}</Text>
            <Text style={styles.limitDesc}>{l.desc}</Text>
          </View>
          <Text style={[styles.limitValue, { color: l.color }]}>{l.value}</Text>
        </View>
      ))}

      {/* Summary */}
      <Card style={{ marginTop: Spacing.sm }}>
        <SectionHeader title="Buying Power" />
        <StatRow
          label="Margin Multiplier"
          value={`${data.marginMultiplier}×`}
          valueColor={Colors.bull}
        />
        <View style={styles.buyPowerNote}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.text.muted} />
          <Text style={styles.noteText}>
            Buying power = Cash Balance × {data.marginMultiplier}. Positions exceeding limits trigger automatic risk alerts.
          </Text>
        </View>
      </Card>

      {/* Compliance Note */}
      <View style={styles.complianceNote}>
        <Ionicons name="lock-closed-outline" size={14} color={Colors.status.warning} />
        <Text style={styles.complianceText}>
          Risk limits are enforced in real-time by the FIX 4.4 compliance engine. Breaches are rejected at the order gateway level.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing.base, gap: Spacing.sm, paddingBottom: 32 },

  header:     { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  headerIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.accent.blue + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: Colors.text.primary, fontSize: Typography.size.xl, fontWeight: '800' },
  headerSub:   { color: Colors.text.muted, fontSize: Typography.size.sm, fontFamily: 'monospace' },

  limitCard: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.sm,
    backgroundColor: Colors.bg.secondary,
    borderRadius:    BorderRadius.lg,
    borderWidth:     1,
    borderColor:     Colors.border.subtle,
    padding:         Spacing.base,
  },
  limitIcon:  { width: 44, height: 44, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  limitBody:  { flex: 1, gap: 2 },
  limitLabel: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700' },
  limitDesc:  { color: Colors.text.muted, fontSize: 11, lineHeight: 16 },
  limitValue: { fontSize: Typography.size.base, fontWeight: '800', fontFamily: 'monospace', textAlign: 'right' },

  buyPowerNote: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs, alignItems: 'flex-start' },
  noteText:     { color: Colors.text.muted, fontSize: Typography.size.xs, flex: 1, lineHeight: 18 },

  complianceNote: {
    flexDirection: 'row', gap: Spacing.xs, alignItems: 'flex-start',
    backgroundColor: Colors.status.warning + '11',
    borderWidth: 1, borderColor: Colors.status.warning + '33',
    borderRadius: BorderRadius.md, padding: Spacing.sm,
  },
  complianceText: { color: Colors.status.warning, fontSize: Typography.size.xs, flex: 1, lineHeight: 18 },
});
