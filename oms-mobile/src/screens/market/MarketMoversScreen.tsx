import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { marketApi } from '../../api';
import { LoadingView, ErrorView, Badge } from '../../components/common';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatPrice, formatChangePct, formatVolume, changeColor } from '../../utils/formatters';
import type { MarketStackProps } from '../../navigation/types';
import type { Instrument } from '../../types/api';

type MoversTab = 'gainers' | 'losers' | 'active';
type ExchangeFilter = 'DSE' | 'CSE';

export default function MarketMoversScreen({ navigation }: MarketStackProps<'MarketMovers'>) {
  const [activeTab, setActiveTab]   = useState<MoversTab>('gainers');
  const [exchange, setExchange]     = useState<ExchangeFilter>('DSE');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey:        ['breadth', exchange],
    queryFn:         () => marketApi.breadth(exchange),
    refetchInterval: 15_000,
  });

  const movers: Instrument[] =
    activeTab === 'gainers' ? (data?.topGainers ?? []) :
    activeTab === 'losers'  ? (data?.topLosers  ?? []) :
                              (data?.mostActive  ?? []);

  const renderItem = ({ item }: { item: Instrument }) => {
    const color = changeColor(item.changePct);
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate('InstrumentDetail', { symbol: item.symbol, exchange: item.exchange })}
        activeOpacity={0.7}
      >
        <View style={styles.rank}>
          <Text style={styles.rankText}>{movers.indexOf(item) + 1}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.symbol}>{item.symbol}</Text>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <View style={styles.meta}>
            <Badge label={item.exchange} />
            {item.sector ? <Text style={styles.sector}>{item.sector}</Text> : null}
          </View>
        </View>
        <View style={styles.right}>
          <Text style={[styles.price, { color }]}>{formatPrice(item.lastPrice)}</Text>
          <View style={[styles.changePill, { backgroundColor: color + '22' }]}>
            <Text style={[styles.changeText, { color }]}>{formatChangePct(item.changePct)}</Text>
          </View>
          <Text style={styles.vol}>
            {activeTab === 'active' ? `Vol: ${formatVolume(item.volume)}` : `${formatPrice(item.previousClose)}`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      {/* Exchange toggle */}
      <View style={styles.exchangeRow}>
        {(['DSE', 'CSE'] as ExchangeFilter[]).map(ex => (
          <TouchableOpacity
            key={ex}
            style={[styles.exBtn, exchange === ex && styles.exBtnActive]}
            onPress={() => setExchange(ex)}
          >
            <Text style={[styles.exText, exchange === ex && styles.exTextActive]}>{ex}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TabBtn label="Top Gainers" icon="trending-up" active={activeTab === 'gainers'} color={Colors.bull}  onPress={() => setActiveTab('gainers')} />
        <TabBtn label="Top Losers"  icon="trending-down" active={activeTab === 'losers'}  color={Colors.bear}  onPress={() => setActiveTab('losers')} />
        <TabBtn label="Most Active" icon="flash"        active={activeTab === 'active'}  color={Colors.accent.blue} onPress={() => setActiveTab('active')} />
      </View>

      {isLoading ? (
        <LoadingView message="Loading market movers…" />
      ) : isError ? (
        <ErrorView onRetry={refetch} />
      ) : (
        <FlatList
          data={movers}
          keyExtractor={item => item.symbol}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} tintColor={Colors.accent.blue} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="bar-chart-outline" size={48} color={Colors.text.muted} />
              <Text style={styles.emptyText}>No data available</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function TabBtn({ label, icon, active, color, onPress }: {
  label: string; icon: any; active: boolean; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tabBtn, active && { borderBottomColor: color, borderBottomWidth: 2 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={14} color={active ? color : Colors.text.muted} />
      <Text style={[styles.tabBtnText, active && { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },

  exchangeRow: {
    flexDirection: 'row', padding: Spacing.sm, gap: Spacing.sm,
    backgroundColor: Colors.bg.secondary, borderBottomWidth: 1, borderBottomColor: Colors.border.subtle,
  },
  exBtn: {
    flex: 1, paddingVertical: 6, borderRadius: BorderRadius.md,
    alignItems: 'center', backgroundColor: Colors.bg.primary,
    borderWidth: 1, borderColor: Colors.border.default,
  },
  exBtnActive: { backgroundColor: Colors.accent.blue, borderColor: Colors.accent.blue },
  exText:      { color: Colors.text.muted, fontSize: Typography.size.sm, fontWeight: '700' },
  exTextActive:{ color: Colors.white },

  tabBar: {
    flexDirection: 'row', backgroundColor: Colors.bg.secondary,
    borderBottomWidth: 1, borderBottomColor: Colors.border.default,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: Spacing.sm, borderBottomColor: 'transparent', borderBottomWidth: 2,
  },
  tabBtnText: { color: Colors.text.muted, fontSize: 11, fontWeight: '700' },

  list: { paddingBottom: 20 },
  sep:  { height: 1, backgroundColor: Colors.border.subtle, marginLeft: Spacing.base + 40 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.base, gap: Spacing.sm,
  },
  rank: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.bg.secondary, borderWidth: 1, borderColor: Colors.border.default,
    alignItems: 'center', justifyContent: 'center',
  },
  rankText: { color: Colors.text.muted, fontSize: 11, fontWeight: '700' },

  info:   { flex: 1, gap: 2 },
  symbol: { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '800', fontFamily: 'monospace' },
  name:   { color: Colors.text.secondary, fontSize: Typography.size.xs },
  meta:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  sector: { color: Colors.text.muted, fontSize: 10 },

  right:      { alignItems: 'flex-end', gap: 4 },
  price:      { fontSize: Typography.size.base, fontWeight: '700', fontFamily: 'monospace' },
  changePill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  changeText: { fontSize: 11, fontWeight: '700' },
  vol:        { color: Colors.text.muted, fontSize: 10 },

  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'], gap: Spacing.sm, marginTop: 60 },
  emptyText: { color: Colors.text.muted, fontSize: Typography.size.sm },
});
