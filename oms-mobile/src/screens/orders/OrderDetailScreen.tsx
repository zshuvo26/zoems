import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi } from '../../api';
import { LoadingView, ErrorView, Card, StatRow, Badge } from '../../components/common';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatBDT, formatDateTime, orderStatusColor, formatQuantity } from '../../utils/formatters';
import { haptic } from '../../utils/haptics';
import type { TradeStackProps } from '../../navigation/types';
import type { OrderStatus } from '../../types/api';

export default function OrderDetailScreen({ route, navigation }: TradeStackProps<'OrderDetail'>) {
  const { orderId } = route.params;
  const qc = useQueryClient();

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey:        ['order', orderId],
    queryFn:         () => ordersApi.get(orderId),
    refetchInterval: 5_000,
  });

  const { data: audit } = useQuery({
    queryKey: ['audit', orderId],
    queryFn:  () => ordersApi.audit(orderId),
  });

  const cancelMut = useMutation({
    mutationFn: () => ordersApi.cancel(orderId, 'Cancelled by user'),
    onSuccess:  () => {
      haptic.success();
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['openOrders'] });
    },
    onError: (e: any) => { haptic.error(); Alert.alert('Error', e.message); },
  });

  if (isLoading) return <LoadingView />;
  if (isError || !order) return <ErrorView onRetry={refetch} />;

  const isOpen = (['NEW', 'PENDING_NEW', 'ACKNOWLEDGED', 'PARTIALLY_FILLED'] as OrderStatus[]).includes(order.status as OrderStatus);
  const statusColor = orderStatusColor(order.status as any);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Header */}
        <Card elevated style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.sideChip, { backgroundColor: order.side === 'BUY' ? Colors.bull + '22' : Colors.bear + '22' }]}>
              <Text style={[styles.sideText, { color: order.side === 'BUY' ? Colors.bull : Colors.bear }]}>{order.side}</Text>
            </View>
            <Text style={styles.symbol}>{order.symbol}</Text>
            <Badge label={order.exchange} />
            <View style={[styles.statusBadge, { borderColor: statusColor }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{order.status}</Text>
            </View>
          </View>
          <Text style={styles.orderId}>#{order.clientOrderId}</Text>
          {order.rejectionReason && (
            <View style={styles.rejectionBox}>
              <Ionicons name="warning" size={14} color={Colors.bear} />
              <Text style={styles.rejectionText}>{order.rejectionReason}</Text>
            </View>
          )}
        </Card>

        {/* Fill Progress */}
        {order.quantity > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>Fill Progress</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(order.filledQuantity / order.quantity) * 100}%` }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>Filled: {formatQuantity(order.filledQuantity ?? 0)}</Text>
              <Text style={styles.progressLabel}>Remaining: {formatQuantity(order.remainingQuantity ?? 0)}</Text>
              <Text style={styles.progressLabel}>Total: {formatQuantity(order.quantity)}</Text>
            </View>
          </Card>
        )}

        {/* Order Details */}
        <Card style={{ gap: 2 }}>
          <Text style={styles.sectionTitle}>Order Details</Text>
          <StatRow label="Order Type"    value={order.orderType} />
          <StatRow label="Time In Force" value={order.timeInForce} />
          <StatRow label="Limit Price"   value={order.price ? formatBDT(order.price) : 'MARKET'} />
          {order.stopPrice && <StatRow label="Stop Price" value={formatBDT(order.stopPrice)} />}
          {order.avgFillPrice && <StatRow label="Avg Fill Price" value={formatBDT(order.avgFillPrice)} valueColor={Colors.bull} />}
        </Card>

        {/* Financials */}
        <Card style={{ gap: 2 }}>
          <Text style={styles.sectionTitle}>Financials (BDT)</Text>
          <StatRow label="Gross Value"  value={formatBDT(order.grossValue)} />
          <StatRow label="Commission"   value={formatBDT(order.commission)} />
          <StatRow label="Net Value"    value={formatBDT(order.netValue)} valueColor={Colors.text.primary} />
          <StatRow label="Settlement"   value={order.settlementDate ?? '—'} />
        </Card>

        {/* Timestamps */}
        <Card style={{ gap: 2 }}>
          <Text style={styles.sectionTitle}>Timestamps</Text>
          <StatRow label="Created" value={formatDateTime(order.createdAt)} />
          <StatRow label="Updated" value={formatDateTime(order.updatedAt)} />
          <StatRow label="Account" value={order.accountId} />
        </Card>

        {/* Audit Trail */}
        <TouchableOpacity
          style={styles.auditBtn}
          onPress={() => { haptic.light(); navigation.navigate('OrderAudit', { orderId }); }}
          activeOpacity={0.7}
        >
          <Ionicons name="git-branch-outline" size={16} color={Colors.accent.blue} />
          <Text style={styles.auditBtnText}>View Full FIX Audit Trail</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.accent.blue} />
        </TouchableOpacity>
      </ScrollView>

      {/* Cancel button */}
      {isOpen && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => Alert.alert('Cancel Order', 'Are you sure?', [
              { text: 'No' },
              { text: 'Yes, Cancel', style: 'destructive', onPress: () => { haptic.warning(); cancelMut.mutate(); } },
            ])}
            disabled={cancelMut.isPending}
          >
            <Text style={styles.cancelText}>{cancelMut.isPending ? 'Cancelling…' : 'Cancel Order'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: Colors.bg.primary },
  scrollContent: { padding: Spacing.base, gap: Spacing.sm, paddingBottom: 100 },

  statusCard:   { gap: Spacing.xs },
  statusRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sideChip:     { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  sideText:     { fontSize: Typography.size.sm, fontWeight: '800' },
  symbol:       { fontSize: Typography.size.lg, fontWeight: '800', color: Colors.text.primary, flex: 1 },
  statusBadge:  { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  statusText:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  orderId:      { color: Colors.text.muted, fontSize: Typography.size.xs, fontFamily: 'monospace' },
  rejectionBox: { flexDirection: 'row', gap: Spacing.xs, backgroundColor: Colors.bear + '22', borderRadius: BorderRadius.sm, padding: Spacing.sm, marginTop: Spacing.xs },
  rejectionText:{ color: Colors.bear, fontSize: Typography.size.xs, flex: 1 },

  sectionTitle: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700', marginBottom: Spacing.xs },

  progressBar:    { height: 6, backgroundColor: Colors.border.default, borderRadius: 3, marginVertical: Spacing.xs },
  progressFill:   { height: '100%', backgroundColor: Colors.bull, borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel:  { color: Colors.text.muted, fontSize: 10 },

  auditRow:     { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xs },
  auditDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent.blue, marginTop: 4 },
  auditContent: { flex: 1 },
  auditAction:  { color: Colors.text.primary, fontSize: Typography.size.xs, fontWeight: '600' },
  auditTime:    { color: Colors.text.muted, fontSize: 10 },
  auditDetails: { color: Colors.text.muted, fontSize: 10, fontFamily: 'monospace' },

  auditBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.accent.blue + '11', borderWidth: 1, borderColor: Colors.accent.blue + '33',
    borderRadius: BorderRadius.md, padding: Spacing.base,
  },
  auditBtnText: { color: Colors.accent.blue, fontSize: Typography.size.sm, fontWeight: '600', flex: 1 },

  footer:     { padding: Spacing.base, backgroundColor: Colors.bg.secondary, borderTopWidth: 1, borderTopColor: Colors.border.default },
  cancelBtn:  { borderWidth: 1, borderColor: Colors.bear, borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, alignItems: 'center' },
  cancelText: { color: Colors.bear, fontSize: Typography.size.base, fontWeight: '700' },
});
