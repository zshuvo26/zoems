import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ipoApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { LoadingView, ErrorView, Card, StatRow } from '../../components/common';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatBDT, formatDate } from '../../utils/formatters';
import type { IpoListing } from '../../types/api';

export default function IpoScreen() {
  const { accountId } = useAuthStore();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['ipo'],
    queryFn:  ipoApi.all,
  });

  const applyMut = useMutation({
    mutationFn: ({ ipoId, lots }: { ipoId: string; lots: number }) =>
      ipoApi.apply(ipoId, accountId!, lots),
    onSuccess: (result: any) => {
      qc.invalidateQueries({ queryKey: ['ipo'] });
      Alert.alert('Application Submitted', `Status: ${result.status ?? 'APPLIED'}`);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const confirmApply = (ipo: IpoListing) => {
    Alert.prompt(
      `Apply for ${ipo.companyName}`,
      `Offer price: ${formatBDT(ipo.issuePrice ?? 0)}\nMin lots: ${ipo.minLots ?? 1} · Max: ${ipo.maxLots ?? 100}\n\nEnter number of lots:`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Apply', onPress: (input) => {
          const n = parseInt(input ?? '0', 10);
          if (!n || n <= 0) { Alert.alert('Invalid', 'Enter a valid lot count'); return; }
          applyMut.mutate({ ipoId: ipo.ipoId, lots: n });
        }},
      ],
      'plain-text',
      String(ipo.minLots ?? 1),
      'numeric',
    );
  };

  if (isLoading) return <LoadingView message="Loading IPOs…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  const ipos = (data ?? []) as IpoListing[];

  return (
    <View style={styles.root}>
      <FlatList
        data={ipos}
        keyExtractor={i => i.ipoId}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.accent.blue} />}
        contentContainerStyle={ipos.length === 0 ? styles.emptyContainer : { padding: Spacing.base, gap: Spacing.base, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="rocket-outline" size={48} color={Colors.text.muted} />
            <Text style={styles.emptyTitle}>No open IPOs</Text>
            <Text style={styles.emptySub}>Check back during subscription windows</Text>
          </View>
        }
        renderItem={({ item: ipo }) => {
          const isOpen   = ipo.status === 'OPEN';
          const isClosed = ipo.status === 'CLOSED';
          const statusColor = isOpen ? Colors.bull : isClosed ? Colors.text.muted : Colors.status.warning;
          return (
            <Card>
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <Text style={styles.company}>{ipo.companyName}</Text>
                  <Text style={styles.symbol}>{ipo.symbol} · {ipo.sector}</Text>
                </View>
                <View style={[styles.statusBadge, { borderColor: statusColor }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{ipo.status}</Text>
                </View>
              </View>

              <StatRow label="Offer Price"        value={formatBDT(ipo.issuePrice ?? 0)} />
              <StatRow label="Face Value"         value={formatBDT(ipo.faceValue ?? 0)} />
              <StatRow label="Total Shares"       value={ipo.totalSharesOnOffer?.toLocaleString() ?? '—'} />
              <StatRow label="Lot Size"           value={String(ipo.lotSize ?? '—')} />
              <StatRow label="Min / Max Lots"     value={`${ipo.minLots ?? 1} / ${ipo.maxLots ?? '—'}`} />
              <StatRow label="Subscription Open"  value={ipo.subscriptionOpen  ? formatDate(ipo.subscriptionOpen)  : '—'} />
              <StatRow label="Subscription Close" value={ipo.subscriptionClose ? formatDate(ipo.subscriptionClose) : '—'} />
              <StatRow label="Allotment Date"     value={ipo.allotmentDate ? formatDate(ipo.allotmentDate) : '—'} />
              <StatRow label="Listing Date"       value={ipo.listingDate  ? formatDate(ipo.listingDate)   : '—'} />

              {isOpen && (
                <TouchableOpacity style={styles.applyBtn} onPress={() => confirmApply(ipo)} disabled={applyMut.isPending}>
                  <Ionicons name="rocket" size={14} color={Colors.white} />
                  <Text style={styles.applyBtnText}>Apply Now</Text>
                </TouchableOpacity>
              )}
              {isClosed && (
                <View style={styles.closedNote}>
                  <Ionicons name="lock-closed" size={12} color={Colors.text.muted} />
                  <Text style={styles.closedText}>Subscription closed</Text>
                </View>
              )}
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: Colors.bg.primary },
  emptyContainer: { flex: 1 },
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingTop: 80 },
  emptyTitle:     { color: Colors.text.secondary, fontSize: Typography.size.base, fontWeight: '700' },
  emptySub:       { color: Colors.text.muted, fontSize: Typography.size.sm },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  headerLeft: { flex: 1 },
  company:    { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '800' },
  symbol:     { color: Colors.text.muted, fontSize: Typography.size.sm },

  statusBadge: { borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  statusText:  { fontSize: Typography.size.xs, fontWeight: '800', letterSpacing: 0.5 },


  applyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    backgroundColor: Colors.bull, borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, marginTop: Spacing.sm,
  },
  applyBtnText: { color: Colors.white, fontSize: Typography.size.sm, fontWeight: '800' },

  closedNote: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, justifyContent: 'center', marginTop: Spacing.sm },
  closedText: { color: Colors.text.muted, fontSize: Typography.size.xs },
});
