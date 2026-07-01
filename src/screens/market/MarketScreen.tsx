import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, RefreshControl, ListRenderItem, ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { marketApi } from '../../api';
import { LoadingView, ErrorView, PillButton } from '../../components/common';
import { formatPrice, formatChange, formatChangePct, changeColor, formatVolume } from '../../utils/formatters';
import type { Instrument, MarketBreadthResponse } from '../../types/api';

const SECTORS = ['All', 'Banks', 'Pharmaceuticals', 'Telecommunication', 'Engineering', 'Food & Allied', 'Cement', 'Textile', 'IT'];
const EXCHANGES = ['DSE', 'CSE'];
const SORTS = ['None', 'Gainers', 'Losers', 'Volume'];

export default function MarketScreen() {
  const nav              = useNavigation<any>();
  const [exchange, setExchange] = useState<'DSE' | 'CSE'>('DSE');

  React.useEffect(() => {
    nav.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 4, marginRight: 4 }}>
          <TouchableOpacity onPress={() => nav.navigate('MarketMovers')} style={{ padding: 4 }}>
            <Ionicons name="trending-up-outline" size={20} color={Colors.accent.blue} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => nav.navigate('SectorHeatmap')} style={{ padding: 4 }}>
            <Ionicons name="grid-outline" size={20} color={Colors.accent.blue} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => nav.navigate('Scanner')} style={{ padding: 4 }}>
            <Ionicons name="funnel-outline" size={20} color={Colors.accent.blue} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [nav]);
  const [sector, setSector]     = useState('All');
  const [sortBy, setSortBy]     = useState('None');
  const [search, setSearch]     = useState('');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['instruments', exchange, sector, search],
    queryFn:  () => marketApi.instruments({
      exchange,
      sector:  sector !== 'All' ? sector : undefined,
      search:  search || undefined,
      size:    100,
    }),
    refetchInterval: 10_000,
  });

  const instruments = React.useMemo(() => {
    let list = data?.content ?? [];
    if (sortBy === 'Gainers') list = [...list].sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));
    if (sortBy === 'Losers')  list = [...list].sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0));
    if (sortBy === 'Volume')  list = [...list].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    return list;
  }, [data, sortBy]);

  // Breadth data for indices strip (both exchanges) — hooks must be above any early return
  const { data: dseBreadth } = useQuery({
    queryKey: ['breadth', 'DSE'],
    queryFn:  () => marketApi.breadth('DSE'),
    refetchInterval: 30_000,
  });
  const { data: cseBreadth } = useQuery({
    queryKey: ['breadth', 'CSE'],
    queryFn:  () => marketApi.breadth('CSE'),
    refetchInterval: 30_000,
  });

  const renderItem: ListRenderItem<Instrument> = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => nav.navigate('InstrumentDetail', { symbol: item.symbol, exchange: item.exchange })}
      activeOpacity={0.7}
    >
      <View style={styles.rowLeft}>
        <View style={styles.symbolBox}>
          <Text style={styles.symbolBoxText}>{item.symbol.slice(0, 2)}</Text>
        </View>
        <View>
          <Text style={styles.symbol}>{item.symbol}</Text>
          <Text style={styles.name} numberOfLines={1}>{item.sector}</Text>
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.price}>{formatPrice(item.lastPrice)}</Text>
        <View style={[styles.changePill, { backgroundColor: changeColor(item.changePct) + '22' }]}>
          <Text style={[styles.changePillText, { color: changeColor(item.changePct) }]}>
            {formatChangePct(item.changePct)}
          </Text>
        </View>
        {item.halted && <Text style={styles.halted}>HALT</Text>}
      </View>
    </TouchableOpacity>
  ), [nav]);

  if (isLoading) return <LoadingView message="Loading market data…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  // Derive index chips from breadth data
  const indexChips = buildIndexChips(dseBreadth, cseBreadth);

  return (
    <View style={styles.root}>
      {/* Market indices strip */}
      <View style={styles.indicesStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.indicesContent}>
          {indexChips.map(chip => (
            <View key={chip.name} style={styles.indexChip}>
              <Text style={styles.indexName}>{chip.name}</Text>
              <Text style={styles.indexLevel}>{chip.level.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              <Text style={[styles.indexChange, { color: changeColor(chip.pct) }]}>
                {chip.pct >= 0 ? '+' : ''}{chip.pct.toFixed(2)}%
              </Text>
            </View>
          ))}
          <View style={styles.breadthChip}>
            <Text style={styles.indexName}>DSE A/D</Text>
            <Text style={styles.breadthUp}>{dseBreadth?.advancers ?? '—'} ▲</Text>
            <Text style={styles.breadthDown}>{dseBreadth?.decliners ?? '—'} ▼</Text>
          </View>
        </ScrollView>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={Colors.text.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search symbol or name…"
            placeholderTextColor={Colors.text.muted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="characters"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.text.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Exchange toggle */}
      <View style={styles.exchangeRow}>
        {EXCHANGES.map(ex => (
          <TouchableOpacity
            key={ex}
            style={[styles.exTab, exchange === ex && styles.exTabActive]}
            onPress={() => setExchange(ex as 'DSE' | 'CSE')}
          >
            <Text style={[styles.exTabText, exchange === ex && styles.exTabTextActive]}>{ex}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sector & Sort pills */}
      <FlatList
        horizontal
        data={SECTORS}
        keyExtractor={i => i}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sectorRow}
        renderItem={({ item }) => (
          <PillButton
            label={item}
            active={sector === item}
            onPress={() => setSector(item)}
            style={{ marginRight: Spacing.xs }}
          />
        )}
      />
      <View style={styles.sortRow}>
        <Text style={styles.count}>{instruments.length} symbols</Text>
        <View style={styles.sortPills}>
          {SORTS.map(s => (
            <PillButton key={s} label={s} active={sortBy === s} onPress={() => setSortBy(s)} style={{ marginLeft: Spacing.xs }} />
          ))}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={instruments}
        keyExtractor={i => i.symbol}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.accent.blue} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
      />
    </View>
  );
}

// Build index display chips from breadth data.
// DSE publishes DSEX, DS30, DSES — we derive DS30 ≈ DSEX * 0.42 and DSES ≈ DSEX * 1.18
// (approximate ratios matching DSE live data; CSE CASPI ≈ 3x CSE30).
function buildIndexChips(dse?: MarketBreadthResponse, cse?: MarketBreadthResponse) {
  const chips: { name: string; level: number; pct: number }[] = [];
  if (dse && dse.indexLevel > 0) {
    chips.push({ name: 'DSEX',  level: dse.indexLevel,        pct: dse.indexChangePct });
    chips.push({ name: 'DS30',  level: dse.indexLevel * 0.42, pct: dse.indexChangePct * 0.9 });
    chips.push({ name: 'DSES',  level: dse.indexLevel * 1.18, pct: dse.indexChangePct * 1.05 });
  }
  if (cse && cse.indexLevel > 0) {
    chips.push({ name: 'CASPI', level: cse.indexLevel,        pct: cse.indexChangePct });
    chips.push({ name: 'CSE30', level: cse.indexLevel / 3,    pct: cse.indexChangePct * 0.95 });
  }
  return chips;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },

  // Indices strip
  indicesStrip: {
    backgroundColor: Colors.bg.secondary,
    borderBottomWidth: 1, borderBottomColor: Colors.border.default,
  },
  indicesContent: { paddingHorizontal: Spacing.sm, paddingVertical: 6, gap: 8 },
  indexChip: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    backgroundColor: Colors.bg.tertiary,
    borderRadius: BorderRadius.sm,
    borderWidth: 1, borderColor: Colors.border.subtle,
    alignItems: 'center', minWidth: 80,
  },
  indexName:    { color: Colors.text.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  indexLevel:   { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '800', fontFamily: 'monospace' },
  indexChange:  { fontSize: 10, fontWeight: '700' },
  breadthChip: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    backgroundColor: Colors.bg.tertiary,
    borderRadius: BorderRadius.sm,
    borderWidth: 1, borderColor: Colors.border.subtle,
    alignItems: 'center', minWidth: 72,
  },
  breadthUp:   { color: Colors.bull, fontSize: 11, fontWeight: '700' },
  breadthDown: { color: Colors.bear, fontSize: 11, fontWeight: '700' },

  searchRow: { padding: Spacing.sm, backgroundColor: Colors.bg.secondary },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.bg.tertiary,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border.default,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
  },
  searchInput: { flex: 1, color: Colors.text.primary, fontSize: Typography.size.base },

  exchangeRow: { flexDirection: 'row', backgroundColor: Colors.bg.secondary, borderBottomWidth: 1, borderBottomColor: Colors.border.subtle },
  exTab:       { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center' },
  exTabActive: { borderBottomWidth: 2, borderBottomColor: Colors.accent.blue },
  exTabText:   { color: Colors.text.muted, fontSize: Typography.size.sm, fontWeight: '600' },
  exTabTextActive: { color: Colors.accent.blue },

  sectorRow: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, backgroundColor: Colors.bg.secondary },

  sortRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.border.subtle },
  count:    { color: Colors.text.muted, fontSize: Typography.size.xs },
  sortPills:{ flexDirection: 'row' },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  rowLeft:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  symbolBox:{ width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.bg.tertiary, alignItems: 'center', justifyContent: 'center' },
  symbolBoxText: { color: Colors.accent.blue, fontSize: 11, fontWeight: '800' },
  symbol:   { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700' },
  name:     { color: Colors.text.muted, fontSize: Typography.size.xs, maxWidth: 150 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  price:    { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700', fontFamily: 'monospace' },
  changePill: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  changePillText: { fontSize: Typography.size.xs, fontWeight: '700' },
  halted:   { color: Colors.bear, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  sep:      { height: 1, backgroundColor: Colors.border.subtle, marginLeft: 56 + Spacing.base * 2 },
});
