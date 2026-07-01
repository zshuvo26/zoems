import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, FlatList, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { ordersApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import type { Order, OrderSearchParams } from '../../types/api';

const STATUS_OPTS = ['', 'NEW', 'PENDING_NEW', 'ACKNOWLEDGED', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED', 'EXPIRED'];
const EXCHANGE_OPTS = ['', 'DSE', 'CSE', 'OTC', 'DARK_POOL'];
const SIDE_OPTS = ['', 'BUY', 'SELL'];

function StatusBadge({ status }: { status: string }) {
  const color = {
    FILLED: Colors.bull, PARTIALLY_FILLED: '#FFB547',
    NEW: Colors.accent.blue, PENDING_NEW: Colors.accent.blue,
    ACKNOWLEDGED: Colors.accent.blue, CANCELLED: Colors.text.muted,
    REJECTED: Colors.bear, EXPIRED: Colors.text.muted,
  }[status] ?? Colors.text.muted;
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '66' }]}>
      <Text style={[styles.badgeText, { color }]}>{status.replace(/_/g, ' ')}</Text>
    </View>
  );
}

function CyclePicker({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  const idx = options.indexOf(value);
  const next = () => onChange(options[(idx + 1) % options.length]);
  return (
    <TouchableOpacity style={styles.picker} onPress={next}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <Text style={styles.pickerValue}>{value || 'Any'}</Text>
    </TouchableOpacity>
  );
}

export default function OrderSearchScreen() {
  const nav = useNavigation<any>();
  const { accountId } = useAuthStore();

  const [symbol, setSymbol]     = useState('');
  const [isin, setIsin]         = useState('');
  const [boid, setBoid]         = useState('');
  const [dealerId, setDealerId] = useState('');
  const [exchange, setExchange] = useState('');
  const [status, setStatus]     = useState('');
  const [side, setSide]         = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [results, setResults]   = useState<Order[] | null>(null);

  const searchMut = useMutation({
    mutationFn: (params: OrderSearchParams) => ordersApi.search(params),
    onSuccess: (data) => setResults(Array.isArray(data) ? data : (data as any)?.data ?? []),
  });

  const onSearch = () => {
    const params: OrderSearchParams = {
      accountId: accountId ?? undefined,
      symbol: symbol.trim().toUpperCase() || undefined,
      isin: isin.trim() || undefined,
      boid: boid.trim() || undefined,
      dealerId: dealerId.trim() || undefined,
      exchange: exchange || undefined,
      status: status || undefined,
      side: side || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };
    searchMut.mutate(params);
  };

  const onClear = () => {
    setSymbol(''); setIsin(''); setBoid(''); setDealerId('');
    setExchange(''); setStatus(''); setSide(''); setDateFrom(''); setDateTo('');
    setResults(null);
  };

  const renderOrder = ({ item: o }: { item: Order }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => nav.navigate('OrderDetail', { orderId: o.id })}
    >
      <View style={styles.rowLeft}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[styles.side, { backgroundColor: o.side === 'BUY' ? Colors.bull + '22' : Colors.bear + '22' }]}>
            <Text style={[styles.sideText, { color: o.side === 'BUY' ? Colors.bull : Colors.bear }]}>{o.side}</Text>
          </View>
          <Text style={styles.symbol}>{o.symbol}</Text>
          <Text style={styles.exchange}>{o.exchange}</Text>
        </View>
        <Text style={styles.detail}>
          {o.quantity?.toLocaleString()} @ {o.price?.toFixed(2) ?? 'MKT'} BDT
        </Text>
        <Text style={styles.meta}>{o.createdAt?.substring(0, 10)} · {o.source}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <StatusBadge status={o.status} />
        <Text style={styles.meta}>{o.orderType}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>INSTRUMENT</Text>
          <View style={styles.row2}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Symbol" placeholderTextColor={Colors.text.muted}
              value={symbol} onChangeText={setSymbol}
              autoCapitalize="characters"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="ISIN" placeholderTextColor={Colors.text.muted}
              value={isin} onChangeText={setIsin}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>PARTICIPANTS</Text>
          <TextInput
            style={styles.input} placeholder="BOID" placeholderTextColor={Colors.text.muted}
            value={boid} onChangeText={setBoid}
          />
          <TextInput
            style={styles.input} placeholder="Dealer ID" placeholderTextColor={Colors.text.muted}
            value={dealerId} onChangeText={setDealerId}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>FILTERS</Text>
          <View style={styles.row2}>
            <CyclePicker label="Exchange" options={EXCHANGE_OPTS} value={exchange} onChange={setExchange} />
            <CyclePicker label="Side"     options={SIDE_OPTS}     value={side}     onChange={setSide}     />
          </View>
          <CyclePicker label="Status" options={STATUS_OPTS} value={status} onChange={setStatus} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>DATE RANGE</Text>
          <View style={styles.row2}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="From yyyy-MM-dd" placeholderTextColor={Colors.text.muted}
              value={dateFrom} onChangeText={setDateFrom}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="To yyyy-MM-dd" placeholderTextColor={Colors.text.muted}
              value={dateTo} onChangeText={setDateTo}
            />
          </View>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchBtn} onPress={onSearch} disabled={searchMut.isPending}>
            {searchMut.isPending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.searchBtnText}>Search</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {results !== null && (
        <View style={styles.results}>
          <Text style={styles.resultHeader}>
            {results.length} result{results.length !== 1 ? 's' : ''}
          </Text>
          <FlatList
            data={results}
            keyExtractor={o => o.id}
            renderItem={renderOrder}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            ListEmptyComponent={
              <Text style={styles.empty}>No orders match your search criteria</Text>
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: Colors.bg.primary },
  form:          { maxHeight: '55%' },
  card:          { backgroundColor: Colors.bg.secondary, margin: Spacing.sm, borderRadius: BorderRadius.md, padding: Spacing.base, borderWidth: 1, borderColor: Colors.border.subtle, gap: Spacing.sm },
  sectionTitle:  { color: Colors.text.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  input:         { backgroundColor: Colors.bg.tertiary ?? Colors.bg.primary, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border.default, color: Colors.text.primary, paddingHorizontal: 12, paddingVertical: 8, fontSize: Typography.size.sm },
  row2:          { flexDirection: 'row', gap: Spacing.sm },
  picker:        { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.bg.primary, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border.default, paddingHorizontal: 12, paddingVertical: 8 },
  pickerLabel:   { color: Colors.text.muted, fontSize: Typography.size.xs },
  pickerValue:   { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '600' },
  btnRow:        { flexDirection: 'row', gap: Spacing.sm, margin: Spacing.sm },
  clearBtn:      { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border.default, alignItems: 'center' },
  clearBtnText:  { color: Colors.text.muted, fontWeight: '700' },
  searchBtn:     { flex: 2, paddingVertical: 12, borderRadius: BorderRadius.md, backgroundColor: Colors.accent.blue, alignItems: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.size.base },
  results:       { flex: 1, paddingHorizontal: Spacing.sm },
  resultHeader:  { color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '700', letterSpacing: 1, paddingVertical: Spacing.sm },
  row:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.base, backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.md },
  rowLeft:       { flex: 1, gap: 3 },
  symbol:        { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '800' },
  exchange:      { color: Colors.text.muted, fontSize: 10, fontWeight: '600' },
  side:          { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sideText:      { fontSize: 10, fontWeight: '800' },
  detail:        { color: Colors.text.secondary, fontSize: Typography.size.xs },
  meta:          { color: Colors.text.muted, fontSize: 10 },
  badge:         { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  badgeText:     { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  sep:           { height: 1, backgroundColor: Colors.border.subtle, marginHorizontal: Spacing.sm },
  empty:         { color: Colors.text.muted, textAlign: 'center', padding: Spacing.xl ?? 32, fontSize: Typography.size.sm },
});
