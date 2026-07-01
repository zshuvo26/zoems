import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, RefreshControl,
  ScrollView, Modal,
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

  const [activeList, setActiveList] = useState('Default');
  const [showAdd, setShowAdd]       = useState(false);
  const [addSymbol, setAddSymbol]   = useState('');
  const [addExchange, setAddExchange] = useState<'DSE' | 'CSE'>('DSE');
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Fetch all list names
  const qLists = useQuery({
    queryKey: ['watchlistLists', accountId],
    queryFn:  () => accountId ? watchlistApi.lists(accountId) : ['Default'],
    enabled:  !!accountId,
  });

  // Fetch items for active list
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey:        ['watchlist', accountId, activeList],
    queryFn:         () => accountId ? watchlistApi.get(accountId, activeList) : [],
    enabled:         !!accountId,
    refetchInterval: 15_000,
  });

  const lists = qLists.data ?? ['Default'];

  const addMut = useMutation({
    mutationFn: ({ symbol, exchange }: { symbol: string; exchange: 'DSE' | 'CSE' }) =>
      watchlistApi.add(accountId!, { symbol, exchange, listName: activeList }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['watchlist'] });
      qc.invalidateQueries({ queryKey: ['watchlistLists'] });
      setAddSymbol('');
      setShowAdd(false);
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to add'),
  });

  const removeMut = useMutation({
    mutationFn: (item: WatchlistItem) => watchlistApi.remove(accountId!, item.symbol, activeList),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['watchlist'] });
      qc.invalidateQueries({ queryKey: ['watchlistLists'] });
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to remove'),
  });

  const createList = () => {
    const name = newListName.trim();
    if (!name) return;
    // Switch to the new list — it will be created when first item is added
    setActiveList(name);
    setNewListName('');
    setShowNewList(false);
    setShowAdd(true);
    qc.setQueryData<string[]>(['watchlistLists', accountId], (prev: string[] | undefined) => {
      const arr = prev ?? ['Default'];
      return arr.includes(name) ? arr : [...arr, name].sort();
    });
  };

  const confirmRemove = (item: WatchlistItem) => {
    Alert.alert(
      'Remove from Watchlist',
      `Remove ${item.symbol} from "${activeList}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeMut.mutate(item) },
      ],
    );
  };

  if (isLoading && qLists.isLoading) return <LoadingView message="Loading watchlists…" />;

  const items = (data ?? []) as WatchlistItem[];

  return (
    <View style={styles.root}>
      {/* List tabs */}
      <View style={styles.listsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listsTabs}>
          {lists.map((l: string) => (
            <TouchableOpacity
              key={l}
              style={[styles.listTab, activeList === l && styles.listTabActive]}
              onPress={() => setActiveList(l)}
            >
              <Text style={[styles.listTabText, activeList === l && styles.listTabTextActive]}>{l}</Text>
              {activeList === l && items.length > 0 && (
                <View style={styles.countBadge}><Text style={styles.countText}>{items.length}</Text></View>
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.newListBtn} onPress={() => setShowNewList(true)}>
            <Ionicons name="add" size={16} color={Colors.accent.blue} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Add symbol bar */}
      {showAdd && (
        <View style={styles.addBar}>
          <TextInput
            style={styles.addInput}
            value={addSymbol}
            onChangeText={setAddSymbol}
            placeholder={`Symbol (e.g. GP, BRAC)`}
            placeholderTextColor={Colors.text.muted}
            autoCapitalize="characters"
            autoFocus
          />
          <View style={styles.addExchangeToggle}>
            {(['DSE', 'CSE'] as const).map(ex => (
              <TouchableOpacity
                key={ex}
                style={[styles.addExBtn, addExchange === ex && styles.addExBtnActive]}
                onPress={() => setAddExchange(ex)}
              >
                <Text style={[styles.addExText, addExchange === ex && { color: Colors.white }]}>{ex}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.addBtn, !addSymbol.trim() && styles.btnDisabled]}
            onPress={() => addMut.mutate({ symbol: addSymbol, exchange: addExchange })}
            disabled={!addSymbol.trim() || addMut.isPending}
          >
            <Text style={styles.addBtnText}>{addMut.isPending ? '…' : 'Add'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setShowAdd(false); setAddSymbol(''); }}>
            <Ionicons name="close" size={20} color={Colors.text.muted} />
          </TouchableOpacity>
        </View>
      )}

      {/* List header */}
      <View style={styles.listHeader}>
        <Text style={styles.listName}>{activeList}</Text>
        <Text style={styles.listCount}>{items.length} stocks</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.accent.blue} />}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : { paddingBottom: 80 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bookmark-outline" size={48} color={Colors.text.muted} />
            <Text style={styles.emptyTitle}>"{activeList}" is empty</Text>
            <Text style={styles.emptySub}>Tap + to add instruments</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const chg      = item.changePct ?? 0;
          const chgColor = changeColor(chg);
          const hasAlert = item.alertUpperPrice ?? item.alertLowerPrice;
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => nav.navigate('InstrumentDetail', { symbol: item.symbol, exchange: item.exchange ?? 'DSE' })}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <Text style={styles.symbol}>{item.symbol}</Text>
                {item.name ? (
                  <Text style={styles.instName} numberOfLines={1}>{item.name}</Text>
                ) : (
                  <Text style={styles.exchange}>{item.exchange ?? 'DSE'}</Text>
                )}
              </View>
              <View style={styles.rowCenter}>
                {hasAlert && (
                  <View style={styles.alertChip}>
                    <Ionicons name="notifications" size={10} color={Colors.status.warning} />
                    <Text style={styles.alertText}>Alert</Text>
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

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(v => !v)} activeOpacity={0.85}>
        <Ionicons name={showAdd ? 'close' : 'add'} size={28} color={Colors.white} />
      </TouchableOpacity>

      {/* New List Modal */}
      <Modal visible={showNewList} transparent animationType="fade" onRequestClose={() => setShowNewList(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowNewList(false)}>
          <View style={styles.modalBox} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Create New List</Text>
            <TextInput
              style={styles.modalInput}
              value={newListName}
              onChangeText={setNewListName}
              placeholder="e.g. Banking, Tech Picks…"
              placeholderTextColor={Colors.text.muted}
              autoFocus
              maxLength={30}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowNewList(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreate, !newListName.trim() && styles.btnDisabled]}
                onPress={createList}
                disabled={!newListName.trim()}
              >
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },

  listsRow: { backgroundColor: Colors.bg.secondary, borderBottomWidth: 1, borderBottomColor: Colors.border.default },
  listsTabs: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, gap: 4, alignItems: 'center' },
  listTab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border.default,
  },
  listTabActive:    { borderColor: Colors.accent.blue, backgroundColor: Colors.accent.blue + '18' },
  listTabText:      { color: Colors.text.muted, fontSize: Typography.size.sm, fontWeight: '600' },
  listTabTextActive:{ color: Colors.accent.blue },
  countBadge:       { backgroundColor: Colors.accent.blue, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  countText:        { color: Colors.white, fontSize: 10, fontWeight: '700' },
  newListBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.accent.blue, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },

  addBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.bg.secondary, padding: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border.default,
  },
  addInput: {
    flex: 1, backgroundColor: Colors.bg.tertiary, borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    color: Colors.text.primary, fontSize: Typography.size.base,
  },
  addExchangeToggle: { flexDirection: 'row', borderWidth: 1, borderColor: Colors.border.default, borderRadius: BorderRadius.sm, overflow: 'hidden' },
  addExBtn:     { paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  addExBtnActive: { backgroundColor: Colors.accent.blue },
  addExText:    { color: Colors.text.muted, fontSize: 11, fontWeight: '700' },
  addBtn:       { backgroundColor: Colors.accent.blue, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.base, paddingVertical: Spacing.xs },
  btnDisabled:  { opacity: 0.5 },
  addBtnText:   { color: Colors.white, fontWeight: '700', fontSize: Typography.size.sm },

  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.xs,
    backgroundColor: Colors.bg.secondary, borderBottomWidth: 1, borderBottomColor: Colors.border.subtle,
  },
  listName:  { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700' },
  listCount: { color: Colors.text.muted, fontSize: Typography.size.xs },

  emptyContainer: { flex: 1 },
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingTop: 80 },
  emptyTitle:     { color: Colors.text.secondary, fontSize: Typography.size.base, fontWeight: '700' },
  emptySub:       { color: Colors.text.muted, fontSize: Typography.size.sm },

  row:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, gap: Spacing.sm },
  rowLeft:   { flex: 2 },
  rowCenter: { flex: 1, alignItems: 'center' },
  rowRight:  { flex: 2, alignItems: 'flex-end' },
  separator: { height: 1, backgroundColor: Colors.border.subtle, marginHorizontal: Spacing.base },

  symbol:   { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '800' },
  instName: { color: Colors.text.muted, fontSize: Typography.size.xs, maxWidth: 120 },
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
    shadowColor: Colors.accent.blue, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center' },
  modalBox: {
    backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, gap: Spacing.base, width: '80%',
    borderWidth: 1, borderColor: Colors.border.default,
  },
  modalTitle:  { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '800' },
  modalInput:  {
    backgroundColor: Colors.bg.tertiary, borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: BorderRadius.md, padding: Spacing.sm, color: Colors.text.primary, fontSize: Typography.size.base,
  },
  modalBtns:       { flexDirection: 'row', gap: Spacing.sm },
  modalCancel:     { flex: 1, padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border.default, alignItems: 'center' },
  modalCancelText: { color: Colors.text.muted, fontWeight: '700' },
  modalCreate:     { flex: 1, padding: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: Colors.accent.blue, alignItems: 'center' },
  modalCreateText: { color: Colors.white, fontWeight: '700' },
});
