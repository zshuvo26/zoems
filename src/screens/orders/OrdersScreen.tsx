import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ordersApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { LoadingView, ErrorView, PillButton, Badge } from '../../components/common';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatBDT, formatDateTime, orderStatusColor } from '../../utils/formatters';
import type { Order, OrderStatus } from '../../types/api';

const STATUS_FILTERS: Array<{ label: string; value: string | undefined }> = [
  { label: 'Open',      value: 'PENDING_NEW' },
  { label: 'Filled',    value: 'FILLED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'All',       value: undefined },
];

export default function OrdersScreen() {
  const nav               = useNavigation<any>();
  const { accountId }     = useAuthStore();
  const queryClient       = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | undefined>('PENDING_NEW');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['orders', accountId, statusFilter],
    queryFn:  () => accountId ? ordersApi.byAccount(accountId, statusFilter) : [],
    enabled:  !!accountId,
    refetchInterval: 10_000,
  });

  const cancelMut = useMutation({
    mutationFn: ({ id }: { id: string }) => ordersApi.cancel(id, 'Cancelled by user'),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['openOrders'] });
    },
    onError:    (e: any) => Alert.alert('Cancel Failed', e.message),
  });

  const handleCancel = (order: Order) => {
    Alert.alert('Cancel Order', `Cancel ${order.side} ${order.quantity} ${order.symbol}?`, [
      { text: 'No' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelMut.mutate({ id: order.id }) },
    ]);
  };

  if (isLoading) return <LoadingView message="Loading orders…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  const orders = (data ?? []) as Order[];

  return (
    <View style={styles.root}>
      {/* Filter pills */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => (
          <PillButton
            key={f.label}
            label={f.label}
            active={statusFilter === f.value}
            onPress={() => setStatusFilter(f.value)}
            style={{ marginRight: Spacing.xs }}
          />
        ))}
      </View>

      <FlatList
        data={orders}
        keyExtractor={o => o.id}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.accent.blue} />}
        contentContainerStyle={orders.length === 0 ? styles.emptyContainer : { padding: Spacing.sm, gap: Spacing.sm, paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="layers-outline" size={48} color={Colors.text.muted} />
            <Text style={styles.emptyText}>No orders</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => nav.navigate('OrderDetail', { orderId: item.id })}
            activeOpacity={0.8}
          >
            <View style={styles.cardTop}>
              <View style={[styles.sideChip, { backgroundColor: item.side === 'BUY' ? Colors.bull + '22' : Colors.bear + '22' }]}>
                <Text style={[styles.sideChipText, { color: item.side === 'BUY' ? Colors.bull : Colors.bear }]}>
                  {item.side}
                </Text>
              </View>
              <Text style={styles.symbol}>{item.symbol}</Text>
              <Text style={styles.exchange}>{item.exchange}</Text>
              <View style={styles.statusBox}>
                <View style={[styles.statusDot, { backgroundColor: orderStatusColor(item.status as any) }]} />
                <Text style={[styles.statusText, { color: orderStatusColor(item.status as any) }]}>{item.status}</Text>
              </View>
            </View>

            <View style={styles.cardMid}>
              <View>
                <Text style={styles.qtyLabel}>Qty</Text>
                <Text style={styles.qtyValue}>{item.quantity?.toLocaleString()}</Text>
              </View>
              <View>
                <Text style={styles.qtyLabel}>Filled</Text>
                <Text style={[styles.qtyValue, { color: Colors.bull }]}>{(item.filledQuantity ?? 0).toLocaleString()}</Text>
              </View>
              <View>
                <Text style={styles.qtyLabel}>Price</Text>
                <Text style={styles.qtyValue}>{item.price ? formatBDT(item.price) : 'MARKET'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.qtyLabel}>Net Value</Text>
                <Text style={styles.qtyValue}>{formatBDT(item.netValue)}</Text>
              </View>
            </View>

            {item.orderType && (
              <View style={styles.cardBottom}>
                <Text style={styles.meta}>{item.orderType} · {item.timeInForce}</Text>
                <Text style={styles.meta}>{formatDateTime(item.createdAt)}</Text>
              </View>
            )}

            {item.rejectionReason && (
              <Text style={styles.rejection}>✗ {item.rejectionReason}</Text>
            )}

            {/* Cancel button for open orders */}
            {(['NEW', 'PENDING_NEW', 'ACKNOWLEDGED', 'PARTIALLY_FILLED'] as OrderStatus[]).includes(item.status as OrderStatus) && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => handleCancel(item)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      />

      {/* FAB: New Order */}
      <TouchableOpacity style={styles.fab} onPress={() => nav.navigate('NewOrder', {})} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  filterRow: { flexDirection: 'row', padding: Spacing.sm, backgroundColor: Colors.bg.secondary, borderBottomWidth: 1, borderBottomColor: Colors.border.subtle },

  emptyContainer: { flex: 1 },
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: Spacing.base },
  emptyText:      { color: Colors.text.muted, fontSize: Typography.size.base },

  card: {
    backgroundColor: Colors.bg.secondary,
    borderRadius:    BorderRadius.lg,
    borderWidth:     1,
    borderColor:     Colors.border.subtle,
    padding:         Spacing.base,
    gap:             Spacing.xs,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sideChip:     { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  sideChipText: { fontSize: Typography.size.xs, fontWeight: '800' },
  symbol:       { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '700', flex: 1 },
  exchange:     { color: Colors.text.muted, fontSize: Typography.size.xs },
  statusBox:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot:    { width: 6, height: 6, borderRadius: 3 },
  statusText:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  cardMid:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  qtyLabel: { color: Colors.text.muted, fontSize: 10 },
  qtyValue: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700' },

  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  meta:       { color: Colors.text.muted, fontSize: 10 },
  rejection:  { color: Colors.bear, fontSize: Typography.size.xs, marginTop: 2 },

  cancelBtn:     { alignSelf: 'flex-end', borderWidth: 1, borderColor: Colors.bear, borderRadius: BorderRadius.sm, paddingHorizontal: 12, paddingVertical: 4, marginTop: 4 },
  cancelBtnText: { color: Colors.bear, fontSize: Typography.size.xs, fontWeight: '700' },

  fab: {
    position:        'absolute',
    bottom:          24,
    right:           24,
    width:           56,
    height:          56,
    borderRadius:    28,
    backgroundColor: Colors.accent.blue,
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     Colors.accent.blue,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.5,
    shadowRadius:    12,
    elevation:       10,
  },
});
