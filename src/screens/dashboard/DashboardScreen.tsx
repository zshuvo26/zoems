import React, { useCallback } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { useAuthStore } from '../../store/auth';
import { marketApi, portfolioApi, ordersApi, notificationsApi } from '../../api';
import { LoadingView, ErrorView, Card, SectionHeader } from '../../components/common';
import {
  formatBDT, formatChangePct, formatChange, changeColor, formatCompact, timeAgo,
} from '../../utils/formatters';
import { StatusBar } from 'expo-status-bar';
import type { Order, Notification } from '../../types/api';

export default function DashboardScreen() {
  const nav         = useNavigation<any>();
  const { accountId, username, role } = useAuthStore();

  const qMarket = useQuery({ queryKey: ['mktStatus'],        queryFn: marketApi.status, refetchInterval: 30_000 });
  const qBreadth = useQuery({ queryKey: ['breadth', 'DSE'], queryFn: () => marketApi.breadth('DSE'), refetchInterval: 30_000 });
  const qPortfolio = useQuery({ queryKey: ['portfolio', accountId], queryFn: () => accountId ? portfolioApi.summary(accountId) : null, enabled: !!accountId });
  const qOrders    = useQuery({ queryKey: ['openOrders', accountId], queryFn: () => accountId ? ordersApi.openOrders(accountId) : [], enabled: !!accountId });
  const qNotif     = useQuery({ queryKey: ['notifUnread', accountId], queryFn: () => accountId ? notificationsApi.unread(accountId) : [], enabled: !!accountId });

  const refetchAll = useCallback(() => {
    qMarket.refetch(); qBreadth.refetch(); qPortfolio.refetch(); qOrders.refetch(); qNotif.refetch();
  }, []);

  const isLoading = qMarket.isLoading || qPortfolio.isLoading;

  if (isLoading) return <LoadingView message="Loading dashboard…" />;

  const market    = qMarket.data;
  const breadth   = qBreadth.data;
  const portfolio = qPortfolio.data;
  const orders    = (qOrders.data ?? []) as Order[];
  const notifs    = (qNotif.data ?? []) as Notification[];

  const sessionColor = market?.open ? Colors.bull : Colors.bear;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning, {username}</Text>
          <Text style={styles.role}>{role} · {accountId || 'No account'}</Text>
        </View>
        <TouchableOpacity onPress={() => nav.navigate('More', { screen: 'Notifications' })}>
          <View style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={Colors.text.primary} />
            {notifs.length > 0 && <View style={styles.notifDot} />}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetchAll} tintColor={Colors.accent.blue} />}
      >
        {/* Market Status Banner */}
        <View style={[styles.sessionBanner, { borderColor: sessionColor }]}>
          <View style={[styles.sessionDot, { backgroundColor: sessionColor }]} />
          <Text style={[styles.sessionText, { color: sessionColor }]}>
            {market?.session ?? '—'}
          </Text>
          <Text style={styles.sessionDetail}>{market?.message ?? ''}</Text>
        </View>

        {/* Portfolio Summary */}
        {portfolio && (
          <Card elevated style={styles.portfolioCard}>
            <Text style={styles.cardLabel}>PORTFOLIO VALUE</Text>
            <Text style={styles.portfolioValue}>{formatBDT(portfolio.portfolioValue)}</Text>
            <View style={styles.pnlRow}>
              <View style={styles.pnlItem}>
                <Text style={styles.pnlLabel}>Day P&L</Text>
                <Text style={[styles.pnlValue, { color: changeColor(portfolio.dayPnl) }]}>
                  {formatChange(portfolio.dayPnl)} ({formatChangePct(portfolio.dayPnlPct)})
                </Text>
              </View>
              <View style={styles.pnlDivider} />
              <View style={styles.pnlItem}>
                <Text style={styles.pnlLabel}>Total P&L</Text>
                <Text style={[styles.pnlValue, { color: changeColor(portfolio.totalPnl) }]}>
                  {formatChange(portfolio.totalPnl)} ({formatChangePct(portfolio.totalPnlPct)})
                </Text>
              </View>
              <View style={styles.pnlDivider} />
              <View style={styles.pnlItem}>
                <Text style={styles.pnlLabel}>Cash</Text>
                <Text style={styles.pnlValue}>{formatCompact(portfolio.cashBalance)}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.viewPortfolioBtn}
              onPress={() => nav.navigate('Portfolio')}
            >
              <Text style={styles.viewPortfolioBtnText}>View Portfolio →</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* DSE Breadth */}
        {breadth && (
          <Card style={styles.breadthCard}>
            <View style={styles.breadthHeader}>
              <View>
                <Text style={styles.cardLabel}>DSEX INDEX</Text>
                <Text style={styles.indexValue}>{(breadth.indexLevel ?? 0).toLocaleString()}</Text>
              </View>
              <Text style={[styles.indexChange, { color: changeColor(breadth.indexChangePct ?? 0) }]}>
                {formatChangePct(breadth.indexChangePct ?? 0)}
              </Text>
            </View>
            <View style={styles.breadthStats}>
              <BreadthStat label="▲ Adv" value={breadth.advancers} color={Colors.bull} />
              <BreadthStat label="▼ Dec" value={breadth.decliners}  color={Colors.bear} />
              <BreadthStat label="= Unch" value={breadth.unchanged} color={Colors.flat} />
              <BreadthStat label="Vol"   value={formatCompact(breadth.totalVolume)} />
            </View>
          </Card>
        )}

        {/* Quick Actions */}
        <SectionHeader title="Quick Actions" />
        <View style={styles.quickActions}>
          <QuickAction icon="add-circle" label="Buy" color={Colors.bull} onPress={() => nav.navigate('Trade', { screen: 'NewOrder', params: { side: 'BUY' } })} />
          <QuickAction icon="remove-circle" label="Sell" color={Colors.bear} onPress={() => nav.navigate('Trade', { screen: 'NewOrder', params: { side: 'SELL' } })} />
          <QuickAction icon="list" label="Orders" color={Colors.accent.blue} onPress={() => nav.navigate('Trade')} />
          <QuickAction icon="bar-chart" label="Market" color={Colors.status.pending} onPress={() => nav.navigate('Market')} />
        </View>

        {/* Open Orders */}
        {orders.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Open Orders" action="All Orders" onAction={() => nav.navigate('Trade')} />
            {orders.slice(0, 3).map(o => (
              <TouchableOpacity
                key={o.id}
                style={styles.orderRow}
                onPress={() => nav.navigate('Trade', { screen: 'OrderDetail', params: { orderId: o.id } })}
              >
                <View style={[styles.sideTag, { backgroundColor: o.side === 'BUY' ? Colors.bull : Colors.bear }]}>
                  <Text style={styles.sideTagText}>{o.side}</Text>
                </View>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderSymbol}>{o.symbol}</Text>
                  <Text style={styles.orderMeta}>{o.orderType} · {o.quantity} shares</Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderPrice}>{formatBDT(o.price)}</Text>
                  <Text style={styles.orderStatus}>{o.status}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Top Gainers */}
        {breadth?.topGainers && breadth.topGainers.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Top Gainers" action="Market" onAction={() => nav.navigate('Market')} />
            {breadth.topGainers.slice(0, 4).map(inst => (
              <TouchableOpacity
                key={inst.symbol}
                style={styles.moverRow}
                onPress={() => nav.navigate('Market', { screen: 'InstrumentDetail', params: { symbol: inst.symbol, exchange: inst.exchange } })}
              >
                <View style={styles.moverLeft}>
                  <Text style={styles.moverSymbol}>{inst.symbol}</Text>
                  <Text style={styles.moverName} numberOfLines={1}>{inst.name}</Text>
                </View>
                <Text style={[styles.moverPct, { color: Colors.bull }]}>
                  +{inst.changePct?.toFixed(2)}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Notifications preview */}
        {notifs.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Notifications" action="All" onAction={() => nav.navigate('More', { screen: 'Notifications' })} />
            {notifs.slice(0, 2).map(n => (
              <View key={n.id} style={styles.notifRow}>
                <View style={styles.notifIcon}>
                  <Ionicons name={notifIcon(n.type)} size={16} color={Colors.accent.blue} />
                </View>
                <View style={styles.notifContent}>
                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifMsg} numberOfLines={1}>{n.message}</Text>
                  <Text style={styles.notifTime}>{timeAgo(n.createdAt)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function BreadthStat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <View style={styles.breadthStat}>
      <Text style={[styles.breadthStatValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.breadthStatLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, color, onPress }: { icon: any; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function notifIcon(type: string): any {
  if (type.startsWith('ORDER'))  return 'swap-vertical-outline';
  if (type.startsWith('PRICE'))  return 'trending-up-outline';
  if (type.startsWith('MARGIN')) return 'warning-outline';
  return 'notifications-outline';
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg.primary },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    padding:        Spacing.base,
    paddingTop:     Spacing.xl,
    backgroundColor: Colors.bg.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  greeting: { color: Colors.text.primary, fontSize: Typography.size.md, fontWeight: '700' },
  role:     { color: Colors.text.muted, fontSize: Typography.size.xs, marginTop: 2 },
  notifBtn: { position: 'relative', padding: 4 },
  notifDot: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.bear },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.base, gap: Spacing.base, paddingBottom: Spacing['2xl'] },

  sessionBanner: {
    flexDirection: 'row',
    alignItems:    'center',
    borderWidth:   1,
    borderRadius:  BorderRadius.md,
    padding:       Spacing.sm,
    gap:           Spacing.sm,
    backgroundColor: Colors.bg.secondary,
  },
  sessionDot:   { width: 8, height: 8, borderRadius: 4 },
  sessionText:  { fontSize: Typography.size.sm, fontWeight: '700' },
  sessionDetail:{ fontSize: Typography.size.xs, color: Colors.text.secondary, flex: 1 },

  portfolioCard: { gap: Spacing.sm },
  cardLabel:    { color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '700', letterSpacing: 1 },
  portfolioValue:{ color: Colors.text.primary, fontSize: 28, fontWeight: '800', fontFamily: 'monospace' },
  pnlRow:       { flexDirection: 'row', marginTop: Spacing.xs },
  pnlItem:      { flex: 1, alignItems: 'center' },
  pnlLabel:     { color: Colors.text.muted, fontSize: 10, marginBottom: 2 },
  pnlValue:     { fontSize: Typography.size.xs, fontWeight: '700' },
  pnlDivider:   { width: 1, backgroundColor: Colors.border.subtle, marginHorizontal: Spacing.xs },
  viewPortfolioBtn:{ marginTop: Spacing.sm, alignItems: 'flex-end' },
  viewPortfolioBtnText:{ color: Colors.accent.blue, fontSize: Typography.size.sm, fontWeight: '600' },

  breadthCard:   { gap: Spacing.sm },
  breadthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  indexValue:   { color: Colors.text.primary, fontSize: Typography.size.xl, fontWeight: '700' },
  indexChange:  { fontSize: Typography.size.md, fontWeight: '700' },
  breadthStats: { flexDirection: 'row', justifyContent: 'space-around' },
  breadthStat:  { alignItems: 'center' },
  breadthStatValue: { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '700' },
  breadthStatLabel: { color: Colors.text.muted, fontSize: 10, marginTop: 2 },

  section: { gap: Spacing.xs },

  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  quickAction: { flex: 1, alignItems: 'center', gap: 6 },
  quickIcon:   { width: 56, height: 56, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  quickLabel:  { color: Colors.text.secondary, fontSize: 11, fontWeight: '600' },

  orderRow: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.bg.secondary,
    borderRadius:    BorderRadius.md,
    padding:         Spacing.sm,
    gap:             Spacing.sm,
    borderWidth:     1,
    borderColor:     Colors.border.subtle,
  },
  sideTag: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
  sideTagText: { color: Colors.white, fontSize: 10, fontWeight: '800' },
  orderInfo: { flex: 1 },
  orderSymbol: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700' },
  orderMeta:   { color: Colors.text.muted, fontSize: Typography.size.xs },
  orderRight:  { alignItems: 'flex-end' },
  orderPrice:  { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700' },
  orderStatus: { color: Colors.text.muted, fontSize: 10 },

  moverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.bg.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  moverLeft:   { flex: 1 },
  moverSymbol: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700' },
  moverName:   { color: Colors.text.muted, fontSize: Typography.size.xs },
  moverPct:    { fontSize: Typography.size.base, fontWeight: '700' },

  notifRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.bg.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  notifIcon:    { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.accent.blue + '22', alignItems: 'center', justifyContent: 'center' },
  notifContent: { flex: 1 },
  notifTitle:   { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '600' },
  notifMsg:     { color: Colors.text.secondary, fontSize: Typography.size.xs },
  notifTime:    { color: Colors.text.muted, fontSize: 10, marginTop: 2 },
});
