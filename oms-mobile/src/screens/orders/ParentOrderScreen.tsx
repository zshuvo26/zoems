import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { parentOrderApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import type { ParentOrder } from '../../types/api';

function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 100 ? Colors.bull : pct > 50 ? Colors.accent.blue : '#FFB547';
  return (
    <View style={styles.progressBg}>
      <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: color }]} />
    </View>
  );
}

export default function ParentOrderScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { accountId } = useAuthStore();
  const parentOrderId = route.params?.parentOrderId as string | undefined;

  // ── View mode: load existing parent order ─────────────────────────────────
  const { data: existing, isLoading: loading } = useQuery({
    queryKey: ['parentOrder', parentOrderId],
    queryFn: () => parentOrderApi.get(parentOrderId!),
    enabled: !!parentOrderId,
  });

  // ── Create mode ───────────────────────────────────────────────────────────
  const [symbol, setSymbol]       = useState('');
  const [side, setSide]           = useState<'BUY' | 'SELL'>('BUY');
  const [exchange, setExchange]   = useState<'DSE' | 'CSE'>('DSE');
  const [totalQty, setTotalQty]   = useState('');
  const [numSlices, setNumSlices] = useState('10');
  const [priceLimit, setPriceLimit] = useState('');
  const [notes, setNotes]         = useState('');

  const createMut = useMutation({
    mutationFn: parentOrderApi.create,
    onSuccess: (po) => {
      nav.replace('ParentOrder', { parentOrderId: po.id ?? (po as any).data?.id });
    },
  });

  const onSubmit = () => {
    if (!symbol.trim() || !totalQty.trim()) return;
    createMut.mutate({
      accountId: accountId!,
      symbol: symbol.trim().toUpperCase(),
      side,
      exchange,
      totalQuantity: parseFloat(totalQty),
      numSlices: parseInt(numSlices, 10) || 10,
      priceLimit: priceLimit ? parseFloat(priceLimit) : undefined,
      notes: notes.trim() || undefined,
    });
  };

  // ── Render existing parent order ──────────────────────────────────────────
  if (parentOrderId) {
    if (loading) return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accent.blue} />
      </View>
    );
    const po: ParentOrder | undefined = (existing as any)?.data ?? existing;
    if (!po) return (
      <View style={styles.center}>
        <Text style={{ color: Colors.text.muted }}>Not found</Text>
      </View>
    );
    const sliceQty = po.totalQuantity / po.numSlices;

    return (
      <ScrollView style={styles.root} contentContainerStyle={{ padding: Spacing.base, gap: Spacing.base }}>
        {/* Header Card */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.symbol}>{po.symbol} · {po.exchange}</Text>
              <Text style={[styles.side, { color: po.side === 'BUY' ? Colors.bull : Colors.bear }]}>{po.side}</Text>
            </View>
            <View style={[styles.statusBadge, {
              backgroundColor: po.status === 'COMPLETED' ? Colors.bull + '22' : Colors.accent.blue + '22',
              borderColor: po.status === 'COMPLETED' ? Colors.bull + '66' : Colors.accent.blue + '66',
            }]}>
              <Text style={{ color: po.status === 'COMPLETED' ? Colors.bull : Colors.accent.blue, fontSize: 11, fontWeight: '700' }}>{po.status}</Text>
            </View>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>EXECUTION PROGRESS</Text>
          <ProgressBar pct={po.progressPct} />
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Total Qty</Text>
              <Text style={styles.statValue}>{po.totalQuantity?.toLocaleString()}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Executed</Text>
              <Text style={[styles.statValue, { color: Colors.bull }]}>{po.executedQuantity?.toLocaleString()}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Remaining</Text>
              <Text style={[styles.statValue, { color: Colors.bear }]}>{po.remainingQuantity?.toLocaleString()}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Slices</Text>
              <Text style={styles.statValue}>{po.completedSlices}/{po.numSlices}</Text>
            </View>
          </View>
          <Text style={{ color: Colors.text.muted, fontSize: 11, textAlign: 'center', marginTop: 4 }}>
            {po.progressPct.toFixed(1)}% complete · ~{sliceQty.toFixed(0)} shares/slice
            {po.priceLimit ? ` · Price limit ৳${po.priceLimit.toFixed(2)}` : ' · Market'}
          </Text>
        </View>

        {/* Child Orders */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>CHILD ORDERS ({po.children?.length ?? 0})</Text>
          {po.children?.map((child, i) => (
            <TouchableOpacity
              key={child.id}
              style={styles.childRow}
              onPress={() => nav.navigate('OrderDetail', { orderId: child.id })}
            >
              <Text style={{ color: Colors.text.muted, fontSize: 11, width: 30 }}>#{i + 1}</Text>
              <Text style={{ color: Colors.text.primary, fontSize: Typography.size.sm, flex: 1 }}>
                {child.quantity?.toLocaleString()} @ {child.price?.toFixed(2) ?? 'MKT'}
              </Text>
              <View style={[styles.childStatus, {
                backgroundColor: child.status === 'FILLED' ? Colors.bull + '22' : Colors.accent.blue + '22',
              }]}>
                <Text style={{ fontSize: 9, color: child.status === 'FILLED' ? Colors.bull : Colors.accent.blue, fontWeight: '700' }}>
                  {child.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  // ── Create mode UI ────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: Spacing.base, gap: Spacing.base }}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>INSTRUMENT</Text>
        <TextInput
          style={styles.input} placeholder="Symbol (e.g. GP)" placeholderTextColor={Colors.text.muted}
          value={symbol} onChangeText={setSymbol} autoCapitalize="characters"
        />
        <View style={styles.toggleRow}>
          {(['DSE', 'CSE'] as const).map(ex => (
            <TouchableOpacity
              key={ex} style={[styles.toggle, exchange === ex && styles.toggleActive]}
              onPress={() => setExchange(ex)}
            >
              <Text style={[styles.toggleText, exchange === ex && styles.toggleTextActive]}>{ex}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>ORDER DIRECTION</Text>
        <View style={styles.toggleRow}>
          {(['BUY', 'SELL'] as const).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.toggle, side === s && { backgroundColor: s === 'BUY' ? Colors.bull + '33' : Colors.bear + '33', borderColor: s === 'BUY' ? Colors.bull : Colors.bear }]}
              onPress={() => setSide(s)}
            >
              <Text style={[styles.toggleText, side === s && { color: s === 'BUY' ? Colors.bull : Colors.bear }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>QUANTITY & SLICING</Text>
        <TextInput
          style={styles.input} placeholder="Total Quantity" placeholderTextColor={Colors.text.muted}
          value={totalQty} onChangeText={setTotalQty} keyboardType="numeric"
        />
        <TextInput
          style={styles.input} placeholder="Number of Slices (default: 10)" placeholderTextColor={Colors.text.muted}
          value={numSlices} onChangeText={setNumSlices} keyboardType="numeric"
        />
        <TextInput
          style={styles.input} placeholder="Price Limit (blank = Market)" placeholderTextColor={Colors.text.muted}
          value={priceLimit} onChangeText={setPriceLimit} keyboardType="decimal-pad"
        />
        {totalQty && numSlices && (
          <Text style={{ color: Colors.text.muted, fontSize: 11 }}>
            ~{(parseFloat(totalQty || '0') / (parseInt(numSlices, 10) || 1)).toFixed(0)} shares per slice
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>NOTES</Text>
        <TextInput
          style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
          placeholder="Optional notes..." placeholderTextColor={Colors.text.muted}
          value={notes} onChangeText={setNotes} multiline
        />
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, (!symbol.trim() || !totalQty) && { opacity: 0.5 }]}
        onPress={onSubmit}
        disabled={createMut.isPending || !symbol.trim() || !totalQty}
      >
        {createMut.isPending
          ? <ActivityIndicator color="#fff" />
          : <>
              <Ionicons name="git-branch" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Create Parent Order &amp; Split</Text>
            </>}
      </TouchableOpacity>

      {createMut.isError && (
        <Text style={{ color: Colors.bear, textAlign: 'center', fontSize: Typography.size.sm }}>
          {(createMut.error as any)?.message ?? 'Submission failed'}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: Colors.bg.primary },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card:           { backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border.subtle, padding: Spacing.base, gap: Spacing.sm },
  sectionTitle:   { color: Colors.text.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  input:          { backgroundColor: Colors.bg.primary, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border.default, color: Colors.text.primary, paddingHorizontal: 12, paddingVertical: 10, fontSize: Typography.size.sm },
  toggleRow:      { flexDirection: 'row', gap: Spacing.sm },
  toggle:         { flex: 1, paddingVertical: 8, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border.default, alignItems: 'center' },
  toggleActive:   { backgroundColor: Colors.accent.blue + '22', borderColor: Colors.accent.blue },
  toggleText:     { color: Colors.text.muted, fontWeight: '600', fontSize: Typography.size.sm },
  toggleTextActive: { color: Colors.accent.blue },
  submitBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 14, borderRadius: BorderRadius.md, backgroundColor: Colors.accent.blue },
  submitBtnText:  { color: '#fff', fontWeight: '700', fontSize: Typography.size.base },
  symbol:         { color: Colors.text.primary, fontSize: Typography.size.xl, fontWeight: '800' },
  side:           { fontSize: Typography.size.base, fontWeight: '700', marginTop: 2 },
  statusBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.sm, borderWidth: 1 },
  progressBg:     { height: 8, backgroundColor: Colors.border.default, borderRadius: 4, overflow: 'hidden', marginVertical: 8 },
  progressFill:   { height: '100%', borderRadius: 4 },
  statsRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  stat:           { alignItems: 'center', gap: 2 },
  statLabel:      { color: Colors.text.muted, fontSize: 10 },
  statValue:      { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700' },
  childRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border.subtle },
  childStatus:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
});
