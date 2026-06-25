import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi } from '../../api';
import { LoadingView, ErrorView } from '../../components/common';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatDateTime, formatBDT } from '../../utils/formatters';
import type { TradeStackProps } from '../../navigation/types';

const EVENT_META: Record<string, { icon: string; color: string }> = {
  CREATED:            { icon: 'add-circle-outline',       color: Colors.accent.blue },
  SUBMITTED:          { icon: 'paper-plane-outline',       color: Colors.accent.blue },
  ACKNOWLEDGED:       { icon: 'checkmark-circle-outline',  color: Colors.status.info },
  PARTIALLY_FILLED:   { icon: 'pie-chart-outline',         color: Colors.status.warning },
  FILLED:             { icon: 'checkmark-done-circle',     color: Colors.bull },
  CANCELLED:          { icon: 'close-circle-outline',      color: Colors.flat },
  REJECTED:           { icon: 'alert-circle-outline',      color: Colors.bear },
  REPLACED:           { icon: 'swap-horizontal-outline',   color: Colors.status.warning },
  EXPIRED:            { icon: 'time-outline',              color: Colors.flat },
  PENDING_NEW:        { icon: 'hourglass-outline',         color: Colors.status.pending },
  NEW:                { icon: 'radio-button-on-outline',   color: Colors.accent.blue },
};

export default function OrderAuditScreen({ route }: TradeStackProps<'OrderAudit'>) {
  const { orderId } = route.params;

  const { data: events, isLoading, isError, refetch } = useQuery({
    queryKey: ['audit', orderId],
    queryFn:  () => ordersApi.audit(orderId),
  });

  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn:  () => ordersApi.get(orderId),
  });

  if (isLoading) return <LoadingView message="Loading audit trail…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Order Summary */}
      {order && (
        <View style={styles.orderSummary}>
          <View style={styles.summaryRow}>
            <Text style={styles.symbol}>{order.symbol}</Text>
            <View style={[styles.sideBadge, { backgroundColor: order.side === 'BUY' ? Colors.bull + '22' : Colors.bear + '22' }]}>
              <Text style={[styles.sideText, { color: order.side === 'BUY' ? Colors.bull : Colors.bear }]}>{order.side}</Text>
            </View>
          </View>
          <Text style={styles.orderId}>Order ID: {order.id}</Text>
          <Text style={styles.orderDetail}>
            {order.quantity.toLocaleString()} @ {formatBDT(order.price)} · {order.orderType} · {order.timeInForce}
          </Text>
        </View>
      )}

      {/* Timeline */}
      <Text style={styles.sectionTitle}>FIX MESSAGE TIMELINE</Text>

      {(!events || events.length === 0) ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={40} color={Colors.text.muted} />
          <Text style={styles.emptyText}>No audit events found</Text>
        </View>
      ) : (
        <View style={styles.timeline}>
          {events.map((event: any, idx: number) => {
            const meta = EVENT_META[event.status ?? event.eventType] ?? { icon: 'ellipse-outline', color: Colors.text.muted };
            const isLast = idx === events.length - 1;
            return (
              <View key={idx} style={styles.timelineItem}>
                {/* Line */}
                <View style={styles.lineCol}>
                  <View style={[styles.dot, { borderColor: meta.color, backgroundColor: meta.color + '22' }]}>
                    <Ionicons name={meta.icon as any} size={14} color={meta.color} />
                  </View>
                  {!isLast && <View style={styles.line} />}
                </View>

                {/* Content */}
                <View style={[styles.eventCard, isLast && { borderColor: meta.color + '44' }]}>
                  <View style={styles.eventHeader}>
                    <Text style={[styles.eventStatus, { color: meta.color }]}>
                      {(event.status ?? event.eventType ?? 'EVENT').replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.eventTime}>{formatDateTime(event.timestamp ?? event.createdAt)}</Text>
                  </View>

                  {event.filledQuantity != null && (
                    <Text style={styles.eventDetail}>
                      Filled: {event.filledQuantity?.toLocaleString()} / {event.quantity?.toLocaleString()}
                      {event.avgFillPrice ? ` @ ${formatBDT(event.avgFillPrice)}` : ''}
                    </Text>
                  )}
                  {event.rejectionReason && (
                    <Text style={[styles.eventDetail, { color: Colors.bear }]}>
                      Reason: {event.rejectionReason}
                    </Text>
                  )}
                  {event.fixMsgType && (
                    <Text style={styles.fixTag}>FIX {event.fixMsgType}</Text>
                  )}
                  {event.message && (
                    <Text style={styles.eventDetail}>{event.message}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing.base, gap: Spacing.sm, paddingBottom: 32 },

  orderSummary: {
    backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border.subtle,
    padding: Spacing.base, gap: Spacing.xs,
  },
  summaryRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  symbol:      { color: Colors.text.primary, fontSize: Typography.size.xl, fontWeight: '800' },
  sideBadge:   { borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  sideText:    { fontSize: Typography.size.sm, fontWeight: '800' },
  orderId:     { color: Colors.text.muted, fontSize: 11, fontFamily: 'monospace' },
  orderDetail: { color: Colors.text.secondary, fontSize: Typography.size.sm },

  sectionTitle: { color: Colors.text.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: Spacing.sm },

  timeline: { gap: 0 },
  timelineItem: { flexDirection: 'row', gap: Spacing.sm },

  lineCol: { alignItems: 'center', width: 32 },
  dot: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  line: { width: 2, flex: 1, backgroundColor: Colors.border.default, marginVertical: 2 },

  eventCard: {
    flex: 1, backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border.subtle,
    padding: Spacing.sm, gap: 4, marginBottom: Spacing.sm,
  },
  eventHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventStatus:  { fontSize: Typography.size.sm, fontWeight: '700' },
  eventTime:    { color: Colors.text.muted, fontSize: 11 },
  eventDetail:  { color: Colors.text.secondary, fontSize: Typography.size.xs },
  fixTag: {
    alignSelf: 'flex-start', backgroundColor: Colors.accent.blue + '22',
    color: Colors.accent.blue, fontSize: 10, fontWeight: '700',
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },

  empty:     { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing['2xl'] },
  emptyText: { color: Colors.text.muted },
});
