import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { marketApi } from '../../api';
import { LoadingView, ErrorView, Badge } from '../../components/common';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatPrice, formatChangePct, formatVolume, changeColor } from '../../utils/formatters';
import type { MarketStackProps } from '../../navigation/types';
import type { Instrument } from '../../types/api';

type SortKey = 'gainers' | 'losers' | 'volume' | 'value' | 'alpha';
type ExchangeFilter = 'ALL' | 'DSE' | 'CSE';

const SECTORS = ['All', 'Bank', 'NBFI', 'Insurance', 'Pharma', 'Telecom', 'Energy', 'Cement', 'Textile', 'Food', 'Engineering', 'IT'];

export default function MarketScannerScreen({ navigation }: MarketStackProps<'Scanner'>) {
  const [exchange, setExchange] = useState<ExchangeFilter>('DSE');
  const [sort, setSort]         = useState<SortKey>('gainers');
  const [sector, setSector]     = useState('All');
  const [search, setSearch]     = useState('');
  const [minPct, setMinPct]     = useState('');
  const [maxPct, setMaxPct]     = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey:        ['scanner', exchange],
    queryFn:         () => marketApi.instruments({ exchange: exchange === 'ALL' ? undefined : exchange, size: 200 }),
    refetchInterval: 30_000,
  });

  const results = useMemo(() => {
    let items: Instrument[] = data?.content ?? [];

    // Sector filter
    if (sector !== 'All') items = items.filter(i => i.sector?.toLowerCase().includes(sector.toLowerCase()));

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(i => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q));
    }

    // % change range
    const lo = parseFloat(minPct);
    const hi = parseFloat(maxPct);
    if (!isNaN(lo)) items = items.filter(i => (i.changePct ?? 0) >= lo);
    if (!isNaN(hi)) items = items.filter(i => (i.changePct ?? 0) <= hi);

    // Sort
    switch (sort) {
      case 'gainers': items = [...items].sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0)); break;
      case 'losers':  items = [...items].sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0)); break;
      case 'volume':  items = [...items].sort((a, b) => (b.volume ?? 0)    - (a.volume ?? 0));    break;
      case 'value':   items = [...items].sort((a, b) => (b.tradedValue ?? 0) - (a.tradedValue ?? 0)); break;
      case 'alpha':   items = [...items].sort((a, b) => b.lastPrice - a.lastPrice); break;
    }

    return items;
  }, [data, sector, search, minPct, maxPct, sort]);

  if (isLoading) return <LoadingView message="Scanning market…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  return (
    <View style={styles.root}>
      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.text.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search symbol or name…"
          placeholderTextColor={Colors.text.muted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.text.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Exchange */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {(['ALL', 'DSE', 'CSE'] as ExchangeFilter[]).map(ex => (
          <Chip key={ex} label={ex} active={exchange === ex} onPress={() => setExchange(ex)} />
        ))}
        <View style={styles.filterDivider} />
        {(['gainers', 'losers', 'volume', 'value'] as SortKey[]).map(s => (
          <Chip key={s} label={s.toUpperCase()} active={sort === s} onPress={() => setSort(s)} color={Colors.accent.purple} />
        ))}
      </ScrollView>

      {/* Sector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectorRow} contentContainerStyle={styles.filterContent}>
        {SECTORS.map(s => (
          <Chip key={s} label={s} active={sector === s} onPress={() => setSector(s)} color={Colors.status.warning} />
        ))}
      </ScrollView>

      {/* % Change Range */}
      <View style={styles.rangeRow}>
        <Ionicons name="funnel-outline" size={14} color={Colors.text.muted} />
        <Text style={styles.rangeLabel}>Change %:</Text>
        <TextInput style={styles.rangeInput} placeholder="Min" placeholderTextColor={Colors.text.muted}
          value={minPct} onChangeText={setMinPct} keyboardType="numeric" />
        <Text style={styles.rangeTo}>to</Text>
        <TextInput style={styles.rangeInput} placeholder="Max" placeholderTextColor={Colors.text.muted}
          value={maxPct} onChangeText={setMaxPct} keyboardType="numeric" />
        <Text style={styles.resultCount}>{results.length} results</Text>
      </View>

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={item => `${item.symbol}-${item.exchange}`}
        renderItem={({ item }) => (
          <ScanResult
            item={item}
            onPress={() => navigation.navigate('InstrumentDetail', { symbol: item.symbol, exchange: item.exchange })}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function ScanResult({ item, onPress }: { item: Instrument; onPress: () => void }) {
  const color = changeColor(item.changePct);
  return (
    <TouchableOpacity style={styles.resultRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.resultLeft}>
        <Text style={styles.resultSymbol}>{item.symbol}</Text>
        <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.resultMeta}>
          <Badge label={item.exchange} />
          {item.sector ? <Text style={styles.resultSector}>{item.sector}</Text> : null}
          {item.halted ? <Badge label="HALTED" color={Colors.bear} style={{ marginLeft: 4 }} /> : null}
        </View>
      </View>
      <View style={styles.resultRight}>
        <Text style={[styles.resultPrice, { color }]}>{formatPrice(item.lastPrice)}</Text>
        <View style={[styles.changePill, { backgroundColor: color + '22' }]}>
          <Text style={[styles.changePillText, { color }]}>{formatChangePct(item.changePct)}</Text>
        </View>
        <Text style={styles.resultVol}>Vol: {formatVolume(item.volume)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function Chip({ label, active, onPress, color = Colors.accent.blue }: { label: string; active: boolean; onPress: () => void; color?: string }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && { backgroundColor: color + '22', borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, active && { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    margin: Spacing.base, backgroundColor: Colors.bg.secondary,
    borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm,
  },
  searchIcon:  { marginRight: 4 },
  searchInput: { flex: 1, color: Colors.text.primary, fontSize: Typography.size.sm, paddingVertical: Spacing.sm },

  filterRow:    { maxHeight: 40 },
  sectorRow:    { maxHeight: 36 },
  filterContent:{ paddingHorizontal: Spacing.base, gap: Spacing.xs, alignItems: 'center' },
  filterDivider:{ width: 1, height: 20, backgroundColor: Colors.border.default, marginHorizontal: 4 },

  chip: {
    borderWidth: 1, borderColor: Colors.border.default, borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 4, backgroundColor: Colors.bg.secondary,
  },
  chipText: { color: Colors.text.muted, fontSize: 11, fontWeight: '600' },

  rangeRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.xs,
    borderBottomWidth: 1, borderBottomColor: Colors.border.subtle,
  },
  rangeLabel:  { color: Colors.text.muted, fontSize: 11 },
  rangeInput:  {
    backgroundColor: Colors.bg.secondary, borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4,
    color: Colors.text.primary, fontSize: 11, width: 52, textAlign: 'center',
  },
  rangeTo:     { color: Colors.text.muted, fontSize: 11 },
  resultCount: { color: Colors.text.muted, fontSize: 10, marginLeft: 'auto' as any },

  list:        { paddingBottom: 20 },
  separator:   { height: 1, backgroundColor: Colors.border.subtle, marginHorizontal: Spacing.base },

  resultRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base },
  resultLeft:  { flex: 1, gap: 2 },
  resultSymbol:{ color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '800', fontFamily: 'monospace' },
  resultName:  { color: Colors.text.secondary, fontSize: Typography.size.xs },
  resultMeta:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  resultSector:{ color: Colors.text.muted, fontSize: 10, marginLeft: 4 },
  resultRight: { alignItems: 'flex-end', gap: 4 },
  resultPrice: { fontSize: Typography.size.base, fontWeight: '700', fontFamily: 'monospace' },
  changePill:  { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  changePillText: { fontSize: 11, fontWeight: '700' },
  resultVol:   { color: Colors.text.muted, fontSize: 10 },
});
