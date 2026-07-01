import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  Alert, Modal, ScrollView, Switch,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { alertsApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { LoadingView, ErrorView } from '../../components/common';
import { formatPrice } from '../../utils/formatters';
import type { PriceAlert } from '../../types/api';

const CONDITIONS = [
  { key: 'ABOVE',    label: 'Price Above',   icon: 'arrow-up-circle-outline'   },
  { key: 'BELOW',    label: 'Price Below',   icon: 'arrow-down-circle-outline' },
  { key: 'PCT_UP',   label: '% Rise',        icon: 'trending-up-outline'       },
  { key: 'PCT_DOWN', label: '% Drop',        icon: 'trending-down-outline'     },
] as const;

function conditionLabel(c: string) {
  return CONDITIONS.find(x => x.key === c)?.label ?? c;
}
function conditionIcon(c: string): keyof typeof Ionicons.glyphMap {
  return (CONDITIONS.find(x => x.key === c)?.icon ?? 'notifications-outline') as any;
}
function conditionColor(c: string) {
  return c === 'ABOVE' || c === 'PCT_UP' ? Colors.bull : Colors.bear;
}

export default function PriceAlertsScreen() {
  const { accountId } = useAuthStore();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    symbol: '', exchange: 'DSE', condition: 'ABOVE' as string,
    targetPrice: '', percentThreshold: '', note: '',
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['priceAlerts', accountId],
    queryFn:  () => accountId ? alertsApi.list(accountId) : [],
    enabled:  !!accountId,
    refetchInterval: 30_000,
  });

  const createMut = useMutation({
    mutationFn: alertsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['priceAlerts'] });
      setShowForm(false);
      setForm({ symbol: '', exchange: 'DSE', condition: 'ABOVE', targetPrice: '', percentThreshold: '', note: '' });
    },
  });

  const deleteMut = useMutation({
    mutationFn: ({ id }: { id: string }) => alertsApi.delete(id, accountId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['priceAlerts'] }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id }: { id: string }) => alertsApi.toggle(id, accountId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['priceAlerts'] }),
  });

  const onSubmit = () => {
    if (!form.symbol.trim()) { Alert.alert('Error', 'Symbol is required'); return; }
    const isPct = form.condition === 'PCT_UP' || form.condition === 'PCT_DOWN';
    if (!isPct && !form.targetPrice) { Alert.alert('Error', 'Target price is required'); return; }
    if (isPct && !form.percentThreshold) { Alert.alert('Error', '% threshold is required'); return; }

    createMut.mutate({
      accountId:         accountId!,
      symbol:            form.symbol.toUpperCase(),
      exchange:          form.exchange,
      condition:         form.condition,
      targetPrice:       isPct ? undefined : parseFloat(form.targetPrice),
      percentThreshold:  isPct ? parseFloat(form.percentThreshold) : undefined,
      note:              form.note || undefined,
      active:            true,
      triggered:         false,
    } as any);
  };

  const active    = (data ?? []).filter((a: PriceAlert) => a.active && !a.triggered);
  const triggered = (data ?? []).filter((a: PriceAlert) => a.triggered);

  if (isLoading) return <LoadingView message="Loading alerts…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Active alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACTIVE ALERTS ({active.length})</Text>
          {active.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={40} color={Colors.text.muted} />
              <Text style={styles.emptyText}>No active alerts</Text>
            </View>
          )}
          {active.map((a: PriceAlert) => <AlertRow key={a.id} alert={a} onDelete={() => {
            Alert.alert('Delete Alert', `Delete alert for ${a.symbol}?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deleteMut.mutate({ id: a.id }) },
            ]);
          }} onToggle={() => toggleMut.mutate({ id: a.id })} />)}
        </View>

        {/* Triggered alerts */}
        {triggered.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>TRIGGERED ({triggered.length})</Text>
            {triggered.map((a: PriceAlert) => <AlertRow key={a.id} alert={a} triggered onDelete={() =>
              deleteMut.mutate({ id: a.id })} onToggle={() => {}} />)}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Price Alert</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Field label="Symbol">
              <TextInput style={styles.input} value={form.symbol} onChangeText={v => setForm(f => ({...f, symbol: v}))}
                placeholder="GP" placeholderTextColor={Colors.text.muted} autoCapitalize="characters" />
            </Field>
            <Field label="Exchange">
              <View style={styles.toggleRow}>
                {['DSE','CSE'].map(ex => (
                  <TouchableOpacity key={ex} style={[styles.toggleOpt, form.exchange === ex && styles.toggleOptActive]}
                    onPress={() => setForm(f => ({...f, exchange: ex}))}>
                    <Text style={[styles.toggleText, form.exchange === ex && styles.toggleTextActive]}>{ex}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>
            <Field label="Condition">
              <View style={styles.condGrid}>
                {CONDITIONS.map(c => (
                  <TouchableOpacity key={c.key} style={[styles.condOpt, form.condition === c.key && styles.condOptActive]}
                    onPress={() => setForm(f => ({...f, condition: c.key}))}>
                    <Ionicons name={c.icon as any} size={16} color={form.condition === c.key ? Colors.accent.blue : Colors.text.muted} />
                    <Text style={[styles.condText, form.condition === c.key && styles.condTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>
            {(form.condition === 'ABOVE' || form.condition === 'BELOW') ? (
              <Field label="Target Price (BDT)">
                <TextInput style={styles.input} value={form.targetPrice} onChangeText={v => setForm(f => ({...f, targetPrice: v}))}
                  placeholder="0.00" placeholderTextColor={Colors.text.muted} keyboardType="decimal-pad" />
              </Field>
            ) : (
              <Field label="Percent Threshold (%)">
                <TextInput style={styles.input} value={form.percentThreshold} onChangeText={v => setForm(f => ({...f, percentThreshold: v}))}
                  placeholder="5.0" placeholderTextColor={Colors.text.muted} keyboardType="decimal-pad" />
              </Field>
            )}
            <Field label="Note (optional)">
              <TextInput style={styles.input} value={form.note} onChangeText={v => setForm(f => ({...f, note: v}))}
                placeholder="e.g. Support level" placeholderTextColor={Colors.text.muted} />
            </Field>
            <TouchableOpacity style={[styles.submitBtn, createMut.isPending && {opacity:0.6}]}
              onPress={onSubmit} disabled={createMut.isPending} activeOpacity={0.85}>
              <Text style={styles.submitText}>{createMut.isPending ? 'Creating…' : 'Create Alert'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function AlertRow({ alert, triggered = false, onDelete, onToggle }: {
  alert: PriceAlert; triggered?: boolean; onDelete: () => void; onToggle: () => void;
}) {
  const color = conditionColor(alert.condition);
  const isPct = alert.condition === 'PCT_UP' || alert.condition === 'PCT_DOWN';
  return (
    <View style={[styles.card, triggered && styles.cardTriggered]}>
      <View style={[styles.cardIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={conditionIcon(alert.condition)} size={20} color={color} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardSymbol}>{alert.symbol}</Text>
          <Text style={styles.cardExchange}>{alert.exchange}</Text>
          {triggered && <View style={styles.triggeredBadge}><Text style={styles.triggeredText}>TRIGGERED</Text></View>}
        </View>
        <Text style={styles.cardCondition}>{conditionLabel(alert.condition)}{' '}
          <Text style={{ color, fontWeight: '800' }}>
            {isPct ? `${alert.percentThreshold}%` : formatPrice(alert.targetPrice)}
          </Text>
        </Text>
        {alert.note ? <Text style={styles.cardNote}>{alert.note}</Text> : null}
      </View>
      <View style={styles.cardActions}>
        {!triggered && <Switch value={alert.active} onValueChange={onToggle}
          trackColor={{ true: Colors.accent.blue + '66', false: Colors.border.default }}
          thumbColor={alert.active ? Colors.accent.blue : Colors.text.muted} />}
        <TouchableOpacity onPress={onDelete} style={{ padding: 4 }}>
          <Ionicons name="trash-outline" size={18} color={Colors.bear} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: Spacing.sm }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg.primary },
  section: { padding: Spacing.base, gap: Spacing.sm },
  sectionLabel: { color: Colors.text.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  empty:   { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyText: { color: Colors.text.muted, fontSize: Typography.size.sm },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border.subtle, padding: Spacing.base,
  },
  cardTriggered: { borderColor: Colors.status.success + '44', backgroundColor: Colors.status.success + '08' },
  cardIcon:    { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardBody:    { flex: 1, gap: 2 },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  cardSymbol:  { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '800' },
  cardExchange:{ color: Colors.text.muted, fontSize: Typography.size.xs, backgroundColor: Colors.bg.tertiary, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
  cardCondition:{ color: Colors.text.secondary, fontSize: Typography.size.sm },
  cardNote:    { color: Colors.text.muted, fontSize: Typography.size.xs },
  cardActions: { alignItems: 'center', gap: Spacing.xs },
  triggeredBadge: { backgroundColor: Colors.status.success + '22', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  triggeredText:  { color: Colors.status.success, fontSize: 9, fontWeight: '800' },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.accent.blue, alignItems: 'center', justifyContent: 'center',
    elevation: 6,
  },

  modal:       { flex: 1, backgroundColor: Colors.bg.primary },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border.subtle },
  modalTitle:  { color: Colors.text.primary, fontSize: Typography.size.lg, fontWeight: '800' },
  modalBody:   { padding: Spacing.base, gap: Spacing.sm },

  fieldLabel: { color: Colors.text.secondary, fontSize: Typography.size.sm, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: Colors.bg.secondary, borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    color: Colors.text.primary, fontSize: Typography.size.base,
  },
  toggleRow: { flexDirection: 'row', borderWidth: 1, borderColor: Colors.border.default, borderRadius: BorderRadius.md, overflow: 'hidden' },
  toggleOpt: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', backgroundColor: Colors.bg.secondary },
  toggleOptActive: { backgroundColor: Colors.accent.blue },
  toggleText: { color: Colors.text.muted, fontSize: Typography.size.sm, fontWeight: '700' },
  toggleTextActive: { color: Colors.white },

  condGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  condOpt: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: Colors.border.default, borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
  },
  condOptActive: { borderColor: Colors.accent.blue, backgroundColor: Colors.accent.blue + '18' },
  condText: { color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '600' },
  condTextActive: { color: Colors.accent.blue },

  submitBtn: { backgroundColor: Colors.accent.blue, borderRadius: BorderRadius.md, paddingVertical: Spacing.base, alignItems: 'center', marginTop: Spacing.sm },
  submitText: { color: Colors.white, fontSize: Typography.size.base, fontWeight: '800' },
});
