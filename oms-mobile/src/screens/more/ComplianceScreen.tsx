import React from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { complianceApi } from '../../api';
import { LoadingView, ErrorView, Card } from '../../components/common';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import type { ComplianceRule } from '../../types/api';

const RULE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  PRICE_BAND:        'trending-up',
  ORDER_SIZE_LIMIT:  'resize',
  SHORT_SELL:        'arrow-down',
  POSITION_LIMIT:    'pie-chart',
  TURNOVER_LIMIT:    'stats-chart',
  DEFAULT:           'shield-checkmark',
};

const RULE_COLOR: Record<string, string> = {
  PRICE_BAND:       Colors.status.warning,
  ORDER_SIZE_LIMIT: Colors.accent.blue,
  SHORT_SELL:       Colors.bear,
  POSITION_LIMIT:   '#9B8CF2',
  TURNOVER_LIMIT:   Colors.status.pending,
  DEFAULT:          Colors.bull,
};

export default function ComplianceScreen() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['compliance'],
    queryFn:  complianceApi.rules,
  });

  if (isLoading) return <LoadingView message="Loading compliance rules…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  const rules = (data ?? []) as ComplianceRule[];

  return (
    <View style={styles.root}>
      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={16} color={Colors.accent.blue} />
        <Text style={styles.infoText}>
          Rules enforced by BSEC / DSE regulations. All orders are validated against these rules before submission.
        </Text>
      </View>

      <FlatList
        data={rules}
        keyExtractor={r => r.id}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.accent.blue} />}
        contentContainerStyle={rules.length === 0 ? styles.emptyContainer : { padding: Spacing.base, gap: Spacing.sm, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="shield-outline" size={48} color={Colors.text.muted} />
            <Text style={styles.emptyTitle}>No compliance rules</Text>
            <Text style={styles.emptySub}>No active rules loaded from server</Text>
          </View>
        }
        renderItem={({ item: rule }) => {
          const icon  = RULE_ICON[rule.ruleType] ?? RULE_ICON.DEFAULT;
          const color = RULE_COLOR[rule.ruleType] ?? RULE_COLOR.DEFAULT;
          return (
            <Card>
              <View style={styles.ruleHeader}>
                <View style={[styles.ruleIconWrap, { backgroundColor: color + '22' }]}>
                  <Ionicons name={icon} size={18} color={color} />
                </View>
                <View style={styles.ruleTitleWrap}>
                  <Text style={styles.ruleName}>{rule.ruleType?.replace(/_/g, ' ')}</Text>
                  <Text style={[styles.ruleType, { color }]}>{rule.scope}</Text>
                </View>
                <View style={[styles.enabledBadge, { borderColor: rule.active ? Colors.bull : Colors.border.default }]}>
                  <Text style={[styles.enabledText, { color: rule.active ? Colors.bull : Colors.text.muted }]}>
                    {rule.active ? 'ACTIVE' : 'DISABLED'}
                  </Text>
                </View>
              </View>

              {rule.description && (
                <Text style={styles.description}>{rule.description}</Text>
              )}

              <View style={styles.paramsGrid}>
                {rule.ruleValue && (
                  <View style={styles.paramItem}>
                    <Text style={styles.paramLabel}>Value</Text>
                    <Text style={styles.paramValue}>{rule.ruleValue}</Text>
                  </View>
                )}
                {rule.effectiveFrom && (
                  <View style={styles.paramItem}>
                    <Text style={styles.paramLabel}>Effective From</Text>
                    <Text style={styles.paramValue}>{rule.effectiveFrom.split('T')[0]}</Text>
                  </View>
                )}
                {rule.effectiveTo && (
                  <View style={styles.paramItem}>
                    <Text style={styles.paramLabel}>Expires</Text>
                    <Text style={styles.paramValue}>{rule.effectiveTo.split('T')[0]}</Text>
                  </View>
                )}
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: Colors.bg.primary },
  emptyContainer: { flex: 1 },
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingTop: 80 },
  emptyTitle:     { color: Colors.text.secondary, fontSize: Typography.size.base, fontWeight: '700' },
  emptySub:       { color: Colors.text.muted, fontSize: Typography.size.sm },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.base,
    backgroundColor: Colors.accent.blue + '11', borderBottomWidth: 1, borderBottomColor: Colors.border.default,
  },
  infoText: { color: Colors.text.secondary, fontSize: Typography.size.xs, flex: 1, lineHeight: 16 },

  ruleHeader:    { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  ruleIconWrap:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  ruleTitleWrap: { flex: 1 },
  ruleName:      { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '800' },
  ruleType:      { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },

  enabledBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  enabledText:  { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  description: { color: Colors.text.muted, fontSize: Typography.size.xs, lineHeight: 16, marginBottom: Spacing.sm },

  paramsGrid: { flexDirection: 'row', gap: Spacing.base, marginTop: Spacing.xs },
  paramItem:  { alignItems: 'center' },
  paramLabel: { color: Colors.text.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  paramValue: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '800', fontFamily: 'monospace' },

  instruments: { marginTop: Spacing.sm, flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', alignItems: 'center' },
  instrLabel:  { color: Colors.text.muted, fontSize: 10 },
  instrList:   { color: Colors.text.secondary, fontSize: 10, fontWeight: '700', flex: 1 },
});
