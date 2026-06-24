import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { algoApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { LoadingView, ErrorView } from '../../components/common';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { algoStatusColor, formatQuantity } from '../../utils/formatters';
import type { AlgoOrder } from '../../types/api';

export default function AlgoOrdersScreen() {
  const nav           = useNavigation<any>();
  const { accountId } = useAuthStore();
  const qc            = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey:        ['algo', accountId],
    queryFn:         () => accountId ? algoApi.byAccount(accountId) : [],
    enabled:         !!accountId,
    refetchInterval: 10_000,
  });

  const pauseMut  = useMutation({ mutationFn: algoApi.pause,  onSuccess: () => qc.invalidateQueries({ queryKey: ['algo'] }) });
  const resumeMut = useMutation({ mutationFn: algoApi.resume, onSuccess: () => qc.invalidateQueries({ queryKey: ['algo'] }) });
  const cancelMut = useMutation({ mutationFn: (id: string) => algoApi.cancel(id, 'Cancelled by user'), onSuccess: () => qc.invalidateQueries({ queryKey: ['algo'] }) });

  if (isLoading) return <LoadingView message="Loading algo orders…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  const orders = (data ?? []) as AlgoOrder[];

  return (
    <View style={styles.root}>
      <FlatList
        data={orders}
        keyExtractor={o => o.id}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.accent.blue} />}
        contentContainerStyle={orders.length === 0 ? styles.emptyContainer : { padding: Spacing.sm, gap: Spacing.sm, paddingBottom: 80 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="git-network-outline" size={48} color={Colors.text.muted} />
            <Text style={styles.emptyText}>No algo orders</Text>
          </View>
        }
        renderItem={({ item: o }) => {
          const progressPct = o.totalSlices > 0 ? (o.completedSlices / o.totalSlices) * 100 : 0;
          const statusColor = algoStatusColor(o.status);
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.algoTypeBadge, { backgroundColor: Colors.status.pending + '22' }]}>
                  <Text style={[styles.algoTypeText, { color: Colors.status.pending }]}>{o.algoType}</Text>
                </View>
                <Text style={styles.symbol}>{o.symbol}</Text>
                <View style={[styles.sidePill, { backgroundColor: o.side === 'BUY' ? Colors.bull + '22' : Colors.bear + '22' }]}>
                  <Text style={{ color: o.side === 'BUY' ? Colors.bull : Colors.bear, fontSize: 10, fontWeight: '800' }}>{o.side}</Text>
                </View>
                <Text style={[styles.status, { color: statusColor }]}>{o.status}</Text>
              </View>

              {/* Progress */}
              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: statusColor }]} />
                </View>
                <Text style={styles.progressText}>{o.completedSlices}/{o.totalSlices} slices</Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Total Qty</Text>
                  <Text style={styles.statValue}>{formatQuantity(o.totalQuantity)}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Executed</Text>
                  <Text style={[styles.statValue, { color: Colors.bull }]}>{formatQuantity(o.executedQuantity ?? 0)}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Remaining</Text>
                  <Text style={styles.statValue}>{formatQuantity(o.remainingQuantity ?? 0)}</Text>
                </View>
                {o.avgExecutedPrice && (
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Avg Price</Text>
                    <Text style={styles.statValue}>{o.avgExecutedPrice?.toFixed(2)}</Text>
                  </View>
                )}
              </View>

              {/* Controls */}
              {o.status === 'RUNNING' && (
                <View style={styles.controls}>
                  <TouchableOpacity style={styles.controlBtn} onPress={() => pauseMut.mutate(o.id)}>
                    <Ionicons name="pause" size={14} color={Colors.status.warning} />
                    <Text style={[styles.controlText, { color: Colors.status.warning }]}>Pause</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.controlBtn, styles.cancelControlBtn]} onPress={() =>
                    Alert.alert('Cancel Algo', 'Cancel this algo order?', [
                      { text: 'No' },
                      { text: 'Yes', style: 'destructive', onPress: () => cancelMut.mutate(o.id) },
                    ])}>
                    <Ionicons name="stop" size={14} color={Colors.bear} />
                    <Text style={[styles.controlText, { color: Colors.bear }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
              {o.status === 'PAUSED' && (
                <View style={styles.controls}>
                  <TouchableOpacity style={styles.controlBtn} onPress={() => resumeMut.mutate(o.id)}>
                    <Ionicons name="play" size={14} color={Colors.bull} />
                    <Text style={[styles.controlText, { color: Colors.bull }]}>Resume</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => nav.navigate('NewAlgoOrder', {})} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  emptyContainer: { flex: 1 },
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.base, paddingTop: 80 },
  emptyText:      { color: Colors.text.muted, fontSize: Typography.size.base },

  card: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  algoTypeBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  algoTypeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  symbol:       { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '800', flex: 1 },
  sidePill:     { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  status:       { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  progressTrack:{ flex: 1, height: 6, backgroundColor: Colors.border.default, borderRadius: 3 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { color: Colors.text.muted, fontSize: 10 },

  statsRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  stat:       {},
  statLabel:  { color: Colors.text.muted, fontSize: 10 },
  statValue:  { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700' },

  controls:   { flexDirection: 'row', gap: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border.subtle, paddingTop: Spacing.sm },
  controlBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border.default, borderRadius: 4, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  cancelControlBtn: {},
  controlText:{ fontSize: Typography.size.xs, fontWeight: '700' },

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
