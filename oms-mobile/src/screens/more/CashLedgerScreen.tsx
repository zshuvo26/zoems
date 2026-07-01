import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { ledgerApi } from '../../api';
import { accountsApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { LoadingView, ErrorView } from '../../components/common';
import { formatBDT, formatDate } from '../../utils/formatters';
import type { LedgerEntry } from '../../types/api';

const TYPE_COLORS: Record<string, string> = {
  DEPOSIT:           Colors.bull,
  WITHDRAWAL:        Colors.bear,
  BUY:               Colors.bear,
  SELL:              Colors.bull,
  COMMISSION:        Colors.status.warning,
  DIVIDEND:          Colors.status.success,
  IPO_ALLOTMENT:     Colors.accent.blue,
  IPO_REFUND:        Colors.bull,
  RIGHTS_SUBSCRIPTION: Colors.status.pending,
  BONUS_CREDIT:      Colors.bull,
};

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  DEPOSIT:           'arrow-down-circle',
  WITHDRAWAL:        'arrow-up-circle',
  BUY:               'cart',
  SELL:              'cash',
  COMMISSION:        'receipt',
  DIVIDEND:          'gift',
  IPO_ALLOTMENT:     'rocket',
  IPO_REFUND:        'return-down-back',
  RIGHTS_SUBSCRIPTION: 'bookmark',
  BONUS_CREDIT:      'star',
};

export default function CashLedgerScreen() {
  const { accountId } = useAuthStore();
  const [page, setPage] = useState(0);

  const { data: account, refetch: refetchAccount } = useQuery({
    queryKey: ['account', accountId],
    queryFn:  () => accountId ? accountsApi.get(accountId) : null,
    enabled:  !!accountId,
  });

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['ledger', accountId, page],
    queryFn:  () => accountId ? ledgerApi.history(accountId, page) : null,
    enabled:  !!accountId,
  });

  const entries: LedgerEntry[] = data?.content ?? [];

  if (isLoading) return <LoadingView message="Loading ledger…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  return (
    <View style={styles.root}>
      {/* Balance summary */}
      <View style={styles.summary}>
        <View style={styles.balRow}>
          <View style={styles.balItem}>
            <Text style={styles.balLabel}>Cash Balance</Text>
            <Text style={styles.balValue}>{formatBDT(account?.cashBalance)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.balItem}>
            <Text style={styles.balLabel}>Available Funds</Text>
            <Text style={[styles.balValue, { color: Colors.bull }]}>{formatBDT(account?.availableFunds)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.balItem}>
            <Text style={styles.balLabel}>Blocked</Text>
            <Text style={[styles.balValue, { color: Colors.status.warning }]}>{formatBDT(account?.blockedAmount)}</Text>
          </View>
        </View>
        <View style={styles.equityRow}>
          <Text style={styles.equityLabel}>Total Equity</Text>
          <Text style={styles.equityValue}>{formatBDT(account?.totalEquity)}</Text>
        </View>
      </View>

      <FlatList
        data={entries}
        keyExtractor={e => e.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => { refetch(); refetchAccount(); }} tintColor={Colors.accent.blue} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={48} color={Colors.text.muted} />
            <Text style={styles.emptyText}>No ledger entries</Text>
          </View>
        }
        ListFooterComponent={
          data && !data.last ? (
            <TouchableOpacity style={styles.loadMore} onPress={() => setPage(p => p + 1)}>
              <Text style={styles.loadMoreText}>Load more</Text>
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item: e }) => {
          const color  = TYPE_COLORS[e.entryType] ?? Colors.text.muted;
          const icon   = TYPE_ICONS[e.entryType]  ?? 'ellipse-outline';
          const isCredit = e.amount >= 0;
          return (
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: color + '22' }]}>
                <Ionicons name={icon} size={20} color={color} />
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowDesc}>{e.description || e.entryType.replace(/_/g, ' ')}</Text>
                  <Text style={[styles.rowAmount, { color: isCredit ? Colors.bull : Colors.bear }]}>
                    {isCredit ? '+' : ''}{formatBDT(Math.abs(e.amount))}
                  </Text>
                </View>
                <View style={styles.rowBot}>
                  {e.symbol ? <Text style={styles.rowSymbol}>{e.symbol} · {e.exchange}</Text> : null}
                  <Text style={styles.rowDate}>{formatDate(e.timestamp)}</Text>
                  <Text style={styles.rowBalance}>Bal: {formatBDT(e.balanceAfter)}</Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },

  summary: {
    backgroundColor: Colors.bg.secondary,
    borderBottomWidth: 1, borderBottomColor: Colors.border.subtle,
    padding: Spacing.base, gap: Spacing.sm,
  },
  balRow:   { flexDirection: 'row', alignItems: 'center' },
  balItem:  { flex: 1, alignItems: 'center', gap: 2 },
  balLabel: { color: Colors.text.muted, fontSize: 10, fontWeight: '700' },
  balValue: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '800', fontFamily: 'monospace' },
  divider:  { width: 1, height: 36, backgroundColor: Colors.border.subtle },
  equityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.bg.tertiary, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.base, paddingVertical: Spacing.xs },
  equityLabel: { color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '600' },
  equityValue: { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '800', fontFamily: 'monospace' },

  sep:      { height: 1, backgroundColor: Colors.border.subtle },
  row:      { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.base },
  iconBox:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowBody:  { flex: 1, gap: 3 },
  rowTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowBot:   { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  rowDesc:  { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '600', flex: 1 },
  rowAmount:{ fontSize: Typography.size.sm, fontWeight: '800', fontFamily: 'monospace' },
  rowSymbol:{ color: Colors.accent.blue, fontSize: Typography.size.xs },
  rowDate:  { color: Colors.text.muted, fontSize: Typography.size.xs },
  rowBalance:{ color: Colors.text.muted, fontSize: Typography.size.xs },

  empty:     { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyText: { color: Colors.text.muted, fontSize: Typography.size.base },
  loadMore:  { padding: Spacing.base, alignItems: 'center' },
  loadMoreText: { color: Colors.accent.blue, fontSize: Typography.size.sm, fontWeight: '600' },
});
