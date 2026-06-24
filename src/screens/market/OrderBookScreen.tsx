import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { marketApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { LoadingView, ErrorView } from '../../components/common';
import { Colors, Spacing, Typography } from '../../theme';
import { formatPrice } from '../../utils/formatters';
import type { MarketStackProps } from '../../navigation/types';
import type { OrderBookLevel } from '../../types/api';

export default function OrderBookScreen({ route }: MarketStackProps<'OrderBook'>) {
  const { symbol, exchange } = route.params;
  const { accountId } = useAuthStore();
  const [book, setBook] = useState<{ bids: OrderBookLevel[]; asks: OrderBookLevel[] }>({ bids: [], asks: [] });

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey:        ['orderBook', symbol, exchange],
    queryFn:         () => marketApi.orderBook(symbol, exchange),
    refetchInterval: 3_000,
  });

  useEffect(() => {
    if (data) setBook({ bids: data.bids ?? [], asks: data.asks ?? [] });
  }, [data]);

  const { subscribe } = useWebSocket(accountId);
  useEffect(() => {
    return subscribe(`/topic/market/${symbol}`, (upd) => {
      if (upd.bids || upd.asks) setBook(b => ({ bids: upd.bids ?? b.bids, asks: upd.asks ?? b.asks }));
    });
  }, [symbol, subscribe]);

  if (isLoading) return <LoadingView message="Loading order book…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  const maxBidQty = Math.max(...(book.bids.map(b => b.quantity ?? 0)), 1);
  const maxAskQty = Math.max(...(book.asks.map(a => a.quantity ?? 0)), 1);

  return (
    <View style={styles.root}>
      {/* Last price bar */}
      <View style={styles.midBar}>
        <Text style={styles.midPrice}>{formatPrice(data?.lastPrice ?? 0)}</Text>
        <Text style={styles.midLabel}>Last Traded Price</Text>
        {data && (
          <Text style={styles.spread}>
            Spread: {formatPrice(data.bidAskSpread)} ({data.bidAskSpreadPct?.toFixed(3)}%)
          </Text>
        )}
      </View>

      <View style={styles.body}>
        {/* Asks (sell side) - reversed so best ask is at bottom */}
        <View style={styles.halfBook}>
          <View style={styles.bookHeader}>
            <Text style={styles.colHeader}>Orders</Text>
            <Text style={styles.colHeader}>Qty</Text>
            <Text style={[styles.colHeader, { textAlign: 'right', color: Colors.bear }]}>Ask Price</Text>
          </View>
          <FlatList
            data={[...book.asks].reverse()}
            keyExtractor={(_, i) => `ask-${i}`}
            refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.accent.blue} />}
            renderItem={({ item }) => <BookRow item={item} side="ask" maxQty={maxAskQty} />}
            inverted
          />
        </View>

        <View style={styles.divider} />

        {/* Bids (buy side) */}
        <View style={styles.halfBook}>
          <View style={styles.bookHeader}>
            <Text style={[styles.colHeader, { color: Colors.bull }]}>Bid Price</Text>
            <Text style={styles.colHeader}>Qty</Text>
            <Text style={styles.colHeader}>Orders</Text>
          </View>
          <FlatList
            data={book.bids}
            keyExtractor={(_, i) => `bid-${i}`}
            renderItem={({ item }) => <BookRow item={item} side="bid" maxQty={maxBidQty} />}
          />
        </View>
      </View>
    </View>
  );
}

function BookRow({ item, side, maxQty }: { item: OrderBookLevel; side: 'bid' | 'ask'; maxQty: number }) {
  const color = side === 'bid' ? Colors.bull : Colors.bear;
  const fillPct = (item.quantity / maxQty) * 100;

  return (
    <View style={styles.bookRow}>
      <View style={[styles.depthFill, {
        width: `${fillPct}%`,
        backgroundColor: color + '18',
        left: side === 'bid' ? 0 : undefined,
        right: side === 'ask' ? 0 : undefined,
      }]} />
      {side === 'ask' ? (
        <>
          <Text style={styles.orders}>{item.orders ?? 1}</Text>
          <Text style={styles.qty}>{item.quantity?.toLocaleString()}</Text>
          <Text style={[styles.bookPrice, { color }]}>{formatPrice(item.price)}</Text>
        </>
      ) : (
        <>
          <Text style={[styles.bookPrice, { color }]}>{formatPrice(item.price)}</Text>
          <Text style={styles.qty}>{item.quantity?.toLocaleString()}</Text>
          <Text style={styles.orders}>{item.orders ?? 1}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  midBar: { padding: Spacing.base, backgroundColor: Colors.bg.secondary, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border.default },
  midPrice: { fontSize: Typography.size.xl, fontWeight: '800', color: Colors.text.primary, fontFamily: 'monospace' },
  midLabel: { color: Colors.text.muted, fontSize: Typography.size.xs },
  spread:   { color: Colors.text.secondary, fontSize: Typography.size.xs, marginTop: 4 },

  body:     { flex: 1, flexDirection: 'column' },
  halfBook: { flex: 1 },
  divider:  { height: 2, backgroundColor: Colors.border.default },

  bookHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.border.subtle },
  colHeader:  { flex: 1, color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '700', letterSpacing: 0.5 },

  bookRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: 5, position: 'relative' },
  depthFill: { position: 'absolute', top: 0, bottom: 0 },
  bookPrice: { flex: 1, fontWeight: '700', fontFamily: 'monospace', fontSize: Typography.size.sm },
  qty:       { flex: 1, textAlign: 'center', color: Colors.text.primary, fontSize: Typography.size.sm },
  orders:    { flex: 1, textAlign: 'right', color: Colors.text.muted, fontSize: Typography.size.xs },
});
