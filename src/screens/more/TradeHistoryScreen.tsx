import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, Share,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { LoadingView, ErrorView, PillButton } from '../../components/common';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatBDT, formatPrice, formatDate } from '../../utils/formatters';
import type { Order, OrderStatus, OrderSide } from '../../types/api';

const STATUS_FILTERS: (OrderStatus | 'ALL')[] = ['ALL', 'FILLED', 'PARTIALLY_FILLED', 'CANCELLED', 'REJECTED'];
const SIDE_FILTERS: (OrderSide | 'ALL')[] = ['ALL', 'BUY', 'SELL'];

function orderToCSVRow(o: Order): string {
  return [
    o.createdAt, o.symbol, o.exchange, o.side, o.orderType,
    o.quantity, o.price ?? '', o.avgFillPrice ?? '', o.filledQuantity,
    o.status, o.commission, o.netValue, o.settlementDate,
  ].join(',');
}

export default function TradeHistoryScreen() {
  const { accountId } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [sideFilter, setSideFilter]     = useState<OrderSide | 'ALL'>('ALL');
  const [search, setSearch]             = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tradeHistory', accountId],
    queryFn:  () => accountId ? ordersApi.byAccount(accountId) : [],
    enabled:  !!accountId,
    staleTime: 30_000,
  });

  const orders = useMemo(() => {
    let list = (data ?? []) as Order[];
    if (statusFilter !== 'ALL') list = list.filter(o => o.status === statusFilter);
    if (sideFilter   !== 'ALL') list = list.filter(o => o.side   === sideFilter);
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter(o => o.symbol.includes(q) || o.id.includes(search.trim()));
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data, statusFilter, sideFilter, search]);

  const exportCSV = async () => {
    const headers = 'Date,Symbol,Exchange,Side,Type,Qty,Price,AvgFill,FilledQty,Status,Commission,NetValue,Settlement\n';
    const rows = orders.map(orderToCSVRow).join('\n');
    const csv = headers + rows;
    try {
      await Share.share({ message: csv, title: 'Trade History Export' });
    } catch {
      Alert.alert('Export', 'Share dialog not available. CSV:\n' + csv.substring(0, 200));
    }
  };

  const summary = useMemo(() => {
    const filled = (data ?? []).filter((o: Order) => o.status === 'FILLED' || o.status === 'PARTIALLY_FILLED');
    const buys  = filled.filter((o: Order) => o.side === 'BUY');
    const sells = filled.filter((o: Order) => o.side === 'SELL');
    const totalBuy  = buys.reduce((s, o: Order)  => s + (o.netValue ?? 0), 0);
    const totalSell = sells.reduce((s, o: Order) => s + (o.netValue ?? 0), 0);
    const commission = filled.reduce((s, o: Order) => s + (o.commission ?? 0), 0);
    return { fills: filled.length, totalBuy, totalSell, commission };
  }, [data]);

  if (isLoading) return <LoadingView message="Loading trade history…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  const statusColor = (s: OrderStatus) => {
    if (s === 'FILLED')   return Colors.bull;
    if (s === 'CANCELLED' || s === 'REJECTED') return Colors.bear;
    if (s === 'PARTIALLY_FILLED') return Colors.status.warning;
    return Colors.text.muted;
  };

  return (
    <View style={styles.root}>
      {/* Summary bar */}
      <View style={styles.summary}>
        <SummaryItem label="Total Fills" value={String(summary.fills)} />
        <SummaryItem label="Buy Value" value={`৳${(summary.totalBuy / 100000).toFixed(1)}L`} color={Colors.bull} />
        <SummaryItem label="Sell Value" value={`৳${(summary.totalSell / 100000).toFixed(1)}L`} color={Colors.bear} />
        <SummaryItem label="Commission" value={formatBDT(summary.commission)} />
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={Colors.text.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search symbol or order ID…"
          placeholderTextColor={Colors.text.muted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="characters"
        />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={Colors.text.muted} /></TouchableOpacity> : null}
        <TouchableOpacity onPress={exportCSV} style={styles.exportBtn}>
          <Ionicons name="download-outline" size={16} color={Colors.accent.blue} />
          <Text style={styles.exportText}>CSV</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        <FlatList
          horizontal
          data={STATUS_FILTERS}
          keyExtractor={i => i}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
          renderItem={({ item }) => (
            <PillButton
              label={item === 'ALL' ? 'All Status' : item.replace('_', ' ')}
              active={statusFilter === item}
              onPress={() => setStatusFilter(item)}
              style={{ marginRight: 4 }}
            />
          )}
        />
      </View>
      <View style={styles.sideFilter}>
        {SIDE_FILTERS.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.sideBtn, sideFilter === s && styles.sideBtnActive,
              s === 'BUY' ? { borderColor: Colors.bull + '66' } : s === 'SELL' ? { borderColor: Colors.bear + '66' } : undefined]}
            onPress={() => setSideFilter(s)}
          >
            <Text style={[styles.sideBtnText,
              sideFilter === s && { color: s === 'BUY' ? Colors.bull : s === 'SELL' ? Colors.bear : Colors.accent.blue }
            ]}>{s}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.resultCount}>{orders.length} orders</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={o => o.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={Colors.text.muted} />
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        }
        renderItem={({ item: o }) => (
          <View style={styles.row}>
            <View style={[styles.sideTag, { backgroundColor: o.side === 'BUY' ? Colors.bull + '22' : Colors.bear + '22' }]}>
              <Text style={[styles.sideTagText, { color: o.side === 'BUY' ? Colors.bull : Colors.bear }]}>{o.side}</Text>
            </View>
            <View style={styles.rowMain}>
              <View style={styles.rowTop}>
                <Text style={styles.symbol}>{o.symbol}</Text>
                <Text style={[styles.status, { color: statusColor(o.status) }]}>{o.status}</Text>
              </View>
              <View style={styles.rowMid}>
                <Text style={styles.meta}>{o.orderType} · {o.filledQuantity}/{o.quantity} shares</Text>
                <Text style={styles.meta}>{formatPrice(o.avgFillPrice ?? o.price)}</Text>
              </View>
              <View style={styles.rowBot}>
                <Text style={styles.date}>{formatDate(o.createdAt)}</Text>
                <Text style={styles.value}>Net: {formatBDT(o.netValue)}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

function SummaryItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryVal, color ? { color } : null]}>{value}</Text>
      <Text style={styles.summaryLbl}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },

  summary: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: Colors.bg.secondary, padding: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border.subtle,
  },
  summaryItem: { alignItems: 'center' },
  summaryVal:  { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '800' },
  summaryLbl:  { color: Colors.text.muted, fontSize: 10, marginTop: 2 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    margin: Spacing.sm, backgroundColor: Colors.bg.secondary,
    borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm,
  },
  searchInput: { flex: 1, color: Colors.text.primary, fontSize: Typography.size.sm, paddingVertical: Spacing.sm },
  exportBtn:   { flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: Spacing.xs },
  exportText:  { color: Colors.accent.blue, fontSize: 11, fontWeight: '700' },

  filters:       { backgroundColor: Colors.bg.secondary },
  filterContent: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, gap: 4 },

  sideFilter: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    borderBottomWidth: 1, borderBottomColor: Colors.border.subtle,
  },
  sideBtn: {
    paddingHorizontal: Spacing.base, paddingVertical: 4,
    borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border.default,
  },
  sideBtnActive: { backgroundColor: Colors.bg.tertiary },
  sideBtnText:   { color: Colors.text.muted, fontSize: 11, fontWeight: '700' },
  resultCount:   { color: Colors.text.muted, fontSize: 10, marginLeft: 'auto' as any },

  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyText: { color: Colors.text.muted, fontSize: Typography.size.base },

  sep: { height: 1, backgroundColor: Colors.border.subtle },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    padding: Spacing.base,
  },
  sideTag:     { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4, minWidth: 38, alignItems: 'center' },
  sideTagText: { fontSize: 11, fontWeight: '800' },
  rowMain:     { flex: 1, gap: 2 },
  rowTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowMid:      { flexDirection: 'row', justifyContent: 'space-between' },
  rowBot:      { flexDirection: 'row', justifyContent: 'space-between' },
  symbol:      { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '800' },
  status:      { fontSize: Typography.size.xs, fontWeight: '700' },
  meta:        { color: Colors.text.secondary, fontSize: Typography.size.xs },
  date:        { color: Colors.text.muted, fontSize: 10 },
  value:       { color: Colors.text.secondary, fontSize: 10, fontWeight: '600' },
});
