import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { watchlistApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { LoadingView, ErrorView } from '../../components/common';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatPrice, formatChangePct, changeColor } from '../../utils/formatters';
import type { WatchlistItem } from '../../types/api';

export default function WatchlistScreen() {
  const nav = useNavigation<any>();
  const { accountId } = useAuthStore();
  const qc = useQueryClient();

  const [addSymbol, setAddSymbol] = useState('');
  const [showAdd, setShowAdd]     = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey:        ['watchlist', accountId],
    queryFn:         () => accountId ? watchlistApi.get(accountId) : [],
    enabled:         !!accountId,
    refetchInterval: 15_000,
  });

  const addMut = useMutation({
    mutationFn: ({ symbol }: { symbol: string }) =>
      watchlistApi.add(accountId!, { symbol: symbol.toUpperCase(), exchange: 'DSE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['watchlist'] });
      setAddSymbol('');
      setShowAdd(false);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const removeMut = useMutation({
    mutationFn: (item: WatchlistItem) => watchlistApi.remove(accountId!, item.symbol),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const confirmRemove = (item: WatchlistItem) => {
    Alert.alert(
      'Remove from Watchlist',
      `Remove ${item.symbol}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeMut.mutate(item) },
      ],
    );
  };

  if (isLoading) return <LoadingView message="Loading watchlist…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  const items = (data ?? []) as WatchlistItem[];

  return (
    <View style={styles.root}>
      {showAdd && (
        <View style={styles.addBar}>
          <TextInput
            style={styles.addInput}
            value={addSymbol}
            onChangeText={setAddSymbol}
            placeholder="Symbol (e.g. GP, BRAC)"
            placeholderTextColor={Colors.text.muted}
            autoCapitalize="characters"
            autoFocus
          />
          <TouchableOpacity
            style={[styles.addBtn, !addSymbol.trim() && styles.btnDisabled]}
            onPress={() => addMut.mutate({ symbol: addSymbol })}
            disabled={!addSymbol.trim() || addMut.isPending}
          >
            <Text style={styles.addBtnText}>{addMut.isPending ? '…' : 'Add'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setShowAdd(false); setAddSymbol(''); }}>
            <Ionicons name="close" size={20} color={Colors.text.muted} />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.accent.blue} />}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : { paddingBottom: 80 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bookmark-outline" size={48} color={Colors.text.muted} />
            <Text style={styles.emptyTitle}>Watchlist is empty</Text>
            <Text style={styles.emptySub}>Tap + to add instruments</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const chg     = item.changePct ?? 0;
          const chgColor= changeColor(chg);
          const alert   = item.alertUpperPrice ?? item.alertLowerPrice;
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => nav.navigate('InstrumentDetail', { symbol: item.symbol, exchange: item.exchange ?? 'DSE' })}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <Text style={styles.symbol}>{item.symbol}</Text>
                <Text style={styles.exchange}>{item.exchange ?? 'DSE'}</Text>
              </View>
              <View style={styles.rowCenter}>
                {alert && (
                  <View style={styles.alertChip}>
                    <Ionicons name="notifications" size={10} color={Colors.status.warning} />
                    <Text style={styles.alertText}>{formatPrice(Number(alert))}</Text>
                  </View>
                )}
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.price}>{item.lastPrice ? formatPrice(item.lastPrice) : '—'}</Text>
                <Text style={[styles.change, { color: chgColor }]}>
                  {chg !== 0 ? formatChangePct(chg) : '—'}
                </Text>
              </View>
              <TouchableOpacity style={styles.removeBtn} onPress={() => confirmRemove(item)}>
                <Ionicons name="trash-outline" size={16} color={Colors.text.muted} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(v => !v)} activeOpacity={0.85}>
        <Ionicons name={showAdd ? 'close' : 'add'} size={28} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: Colors.bg.primary },
  emptyContainer: { flex: 1 },
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingTop: 80 },
  emptyTitle:     { color: Colors.text.secondary, fontSize: Typography.size.base, fontWeight: '700' },
  emptySub:       { color: Colors.text.muted, fontSize: Typography.size.sm },

  addBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.bg.secondary, padding: Spacing.base,
    borderBottomWidth: 1, borderBottomColor: Colors.border.default,
  },
  addInput: {
    flex: 1, backgroundColor: Colors.bg.tertiary, borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    color: Colors.text.primary, fontSize: Typography.size.base,
  },
  addBtn:      { backgroundColor: Colors.accent.blue, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.base, paddingVertical: Spacing.xs },
  btnDisabled: { opacity: 0.5 },
  addBtnText:  { color: Colors.white, fontWeight: '700', fontSize: Typography.size.sm },

  row:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, gap: Spacing.sm },
  rowLeft:   { flex: 2 },
  rowCenter: { flex: 1, alignItems: 'center' },
  rowRight:  { flex: 2, alignItems: 'flex-end' },
  separator: { height: 1, backgroundColor: Colors.border.subtle, marginHorizontal: Spacing.base },

  symbol:   { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '800' },
  exchange: { color: Colors.text.muted, fontSize: Typography.size.xs },
  price:    { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '700', fontFamily: 'monospace' },
  change:   { fontSize: Typography.size.xs, fontWeight: '700' },

  alertChip: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colors.status.warning + '22', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  alertText: { color: Colors.status.warning, fontSize: 9, fontWeight: '700' },

  removeBtn: { padding: Spacing.xs },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.accent.blue,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.accent.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
  },
});
