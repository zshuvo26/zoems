import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { portfolioApi, accountsApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { LoadingView, ErrorView } from '../../components/common';
import { formatBDT, formatPrice } from '../../utils/formatters';

type TargetItem = { symbol: string; exchange: string; targetPct: number; currentPct: number; currentValue: number; lastPrice: number; currentShares: number; };

export default function RebalanceScreen() {
  const { accountId } = useAuthStore();
  const nav = useNavigation<any>();
  const [targets, setTargets] = useState<Record<string, string>>({});

  const { data: summary, isLoading, isError, refetch } = useQuery({
    queryKey: ['portfolio', accountId],
    queryFn:  () => accountId ? portfolioApi.summary(accountId) : null,
    enabled:  !!accountId,
  });

  const { data: account } = useQuery({
    queryKey: ['account', accountId],
    queryFn:  () => accountId ? accountsApi.get(accountId) : null,
    enabled:  !!accountId,
  });

  const totalEquity = account?.totalEquity ?? 0;
  const holdings    = summary?.positions ?? [];

  // Compute current allocation % for each holding
  const items: TargetItem[] = useMemo(() => holdings.map((p: any) => ({
    symbol:        p.symbol,
    exchange:      p.exchange,
    currentValue:  p.marketValue,
    currentPct:    totalEquity > 0 ? (p.marketValue / totalEquity) * 100 : 0,
    lastPrice:     p.lastPrice,
    currentShares: p.quantity,
    targetPct:     parseFloat(targets[p.symbol] ?? '0') || 0,
  })), [holdings, targets, totalEquity]);

  const totalTargetPct = items.reduce((s, i) => s + i.targetPct, 0);
  const cashTargetPct  = Math.max(0, 100 - totalTargetPct);
  const cashPct        = totalEquity > 0 ? ((account?.availableFunds ?? 0) / totalEquity) * 100 : 0;

  // Generate rebalancing orders
  const orders = useMemo(() => items
    .map(item => {
      const targetValue  = (item.targetPct / 100) * totalEquity;
      const diff         = targetValue - item.currentValue;
      if (Math.abs(diff) < 1000) return null; // ignore tiny differences
      const sharesNeeded = Math.round(diff / item.lastPrice);
      if (sharesNeeded === 0) return null;
      return {
        symbol:    item.symbol,
        exchange:  item.exchange,
        side:      sharesNeeded > 0 ? 'BUY' : 'SELL',
        quantity:  Math.abs(sharesNeeded),
        price:     item.lastPrice,
        value:     Math.abs(diff),
        currentPct: item.currentPct,
        targetPct:  item.targetPct,
      };
    })
    .filter(Boolean)
  , [items, totalEquity]);

  const onLaunchBasket = () => {
    if (orders.length === 0) { Alert.alert('No trades needed', 'Portfolio is already at target allocation.'); return; }
    nav.navigate('Trade', {
      screen: 'BasketOrder',
      params: { preloadOrders: orders.map(o => ({
        symbol: o!.symbol, exchange: o!.exchange, side: o!.side,
        orderType: 'LIMIT', timeInForce: 'DAY',
        quantity: o!.quantity, price: o!.price, accountId,
      }))},
    });
  };

  if (isLoading) return <LoadingView message="Loading portfolio…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Equity</Text>
              <Text style={styles.summaryValue}>{formatBDT(totalEquity)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Allocated %</Text>
              <Text style={[styles.summaryValue, { color: totalTargetPct > 100 ? Colors.bear : Colors.bull }]}>
                {totalTargetPct.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Cash Target</Text>
              <Text style={styles.summaryValue}>{cashTargetPct.toFixed(1)}%</Text>
            </View>
          </View>
          {totalTargetPct > 100 && (
            <View style={styles.warning}>
              <Ionicons name="warning" size={14} color={Colors.bear} />
              <Text style={styles.warningText}>Target exceeds 100% — reduce allocations</Text>
            </View>
          )}
        </View>

        {/* Holdings with target input */}
        <Text style={styles.sectionLabel}>SET TARGET ALLOCATION (%)</Text>
        {items.map(item => (
          <View key={item.symbol} style={styles.holdingRow}>
            <View style={styles.holdingInfo}>
              <Text style={styles.holdingSymbol}>{item.symbol}</Text>
              <Text style={styles.holdingCurrent}>Current: {item.currentPct.toFixed(1)}% · {formatBDT(item.currentValue)}</Text>
            </View>
            <View style={styles.targetInput}>
              <TextInput
                style={styles.pctInput}
                value={targets[item.symbol] ?? ''}
                onChangeText={v => setTargets(t => ({ ...t, [item.symbol]: v }))}
                placeholder={item.currentPct.toFixed(1)}
                placeholderTextColor={Colors.text.muted}
                keyboardType="decimal-pad"
              />
              <Text style={styles.pctSymbol}>%</Text>
            </View>
          </View>
        ))}

        {/* Cash row */}
        <View style={[styles.holdingRow, { opacity: 0.7 }]}>
          <View style={styles.holdingInfo}>
            <Text style={styles.holdingSymbol}>CASH</Text>
            <Text style={styles.holdingCurrent}>Current: {cashPct.toFixed(1)}% · {formatBDT(account?.availableFunds)}</Text>
          </View>
          <View style={styles.targetInput}>
            <Text style={[styles.pctInput, { color: cashTargetPct < 0 ? Colors.bear : Colors.text.primary }]}>
              {cashTargetPct.toFixed(1)}
            </Text>
            <Text style={styles.pctSymbol}>%</Text>
          </View>
        </View>

        {/* Generated orders */}
        {orders.length > 0 && (
          <View style={styles.ordersSection}>
            <Text style={styles.sectionLabel}>REBALANCING ORDERS ({orders.length})</Text>
            {orders.map((o, i) => o && (
              <View key={i} style={styles.orderRow}>
                <View style={[styles.sideTag, { backgroundColor: o.side === 'BUY' ? Colors.bull + '22' : Colors.bear + '22' }]}>
                  <Text style={[styles.sideTagText, { color: o.side === 'BUY' ? Colors.bull : Colors.bear }]}>{o.side}</Text>
                </View>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderSymbol}>{o.symbol}</Text>
                  <Text style={styles.orderDetail}>{o.quantity} shares @ {formatPrice(o.price)}</Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderValue}>{formatBDT(o.value)}</Text>
                  <Text style={styles.orderPct}>{o.currentPct.toFixed(1)}% → {o.targetPct.toFixed(1)}%</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {items.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="pie-chart-outline" size={48} color={Colors.text.muted} />
            <Text style={styles.emptyText}>No holdings to rebalance</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer action */}
      {orders.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <Text style={styles.footerLabel}>{orders.length} orders · Est. value</Text>
            <Text style={styles.footerValue}>{formatBDT(orders.reduce((s, o) => s + (o?.value ?? 0), 0))}</Text>
          </View>
          <TouchableOpacity style={styles.launchBtn} onPress={onLaunchBasket} activeOpacity={0.85}>
            <Ionicons name="layers" size={18} color={Colors.white} />
            <Text style={styles.launchText}>Launch Basket</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  summaryCard: {
    margin: Spacing.base, backgroundColor: Colors.bg.secondary,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border.subtle, padding: Spacing.base, gap: Spacing.sm,
  },
  summaryRow:  { flexDirection: 'row' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryLabel:{ color: Colors.text.muted, fontSize: 10, fontWeight: '700' },
  summaryValue:{ color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '800', fontFamily: 'monospace' },
  warning:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.bear + '18', borderRadius: BorderRadius.sm, padding: Spacing.xs },
  warningText: { color: Colors.bear, fontSize: 11 },

  sectionLabel: { color: Colors.text.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, paddingHorizontal: Spacing.base, paddingVertical: Spacing.xs },

  holdingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border.subtle,
  },
  holdingInfo:    { flex: 1 },
  holdingSymbol:  { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700' },
  holdingCurrent: { color: Colors.text.muted, fontSize: Typography.size.xs },
  targetInput:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  pctInput: {
    backgroundColor: Colors.bg.secondary, borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: BorderRadius.sm, paddingHorizontal: 10, paddingVertical: 6,
    color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700',
    width: 64, textAlign: 'right',
  },
  pctSymbol: { color: Colors.text.muted, fontSize: Typography.size.sm, fontWeight: '700' },

  ordersSection: { paddingTop: Spacing.sm },
  orderRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border.subtle,
  },
  sideTag:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, minWidth: 40, alignItems: 'center' },
  sideTagText: { fontSize: 11, fontWeight: '800' },
  orderInfo:   { flex: 1 },
  orderSymbol: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700' },
  orderDetail: { color: Colors.text.muted, fontSize: Typography.size.xs },
  orderRight:  { alignItems: 'flex-end' },
  orderValue:  { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700', fontFamily: 'monospace' },
  orderPct:    { color: Colors.text.muted, fontSize: Typography.size.xs },

  empty:     { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyText: { color: Colors.text.muted, fontSize: Typography.size.base },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.base,
    backgroundColor: Colors.bg.secondary, borderTopWidth: 1, borderTopColor: Colors.border.subtle,
    padding: Spacing.base,
  },
  footerInfo:  { flex: 1 },
  footerLabel: { color: Colors.text.muted, fontSize: Typography.size.xs },
  footerValue: { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '800' },
  launchBtn:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.accent.blue, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  launchText:  { color: Colors.white, fontSize: Typography.size.sm, fontWeight: '800' },
});
