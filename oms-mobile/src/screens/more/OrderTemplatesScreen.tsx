import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  Alert, Modal, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { templatesApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { LoadingView, ErrorView } from '../../components/common';
import { formatPrice } from '../../utils/formatters';
import type { OrderTemplate } from '../../types/api';

const ORDER_TYPES = ['LIMIT','MARKET','STOP_LIMIT','STOP_LOSS'] as const;
const TIF_OPTIONS = ['DAY','GTC','IOC','FOK'] as const;

export default function OrderTemplatesScreen() {
  const { accountId } = useAuthStore();
  const nav = useNavigation<any>();
  const qc  = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    templateName: '', symbol: '', exchange: 'DSE', side: 'BUY',
    orderType: 'LIMIT', timeInForce: 'DAY', quantity: '', price: '', stopPrice: '',
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['templates', accountId],
    queryFn:  () => accountId ? templatesApi.list(accountId) : [],
    enabled:  !!accountId,
  });

  const saveMut = useMutation({
    mutationFn: templatesApi.save,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); setShowForm(false); },
  });
  const deleteMut = useMutation({
    mutationFn: ({ id }: { id: string }) => templatesApi.delete(id, accountId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });

  const onUse = (t: OrderTemplate) => {
    nav.navigate('Trade', {
      screen: 'NewOrder',
      params: {
        symbol: t.symbol, exchange: t.exchange, side: t.side,
        orderType: t.orderType, timeInForce: t.timeInForce,
        price: t.price, quantity: t.quantity, stopPrice: t.stopPrice,
      },
    });
  };

  const onSubmit = () => {
    if (!form.templateName.trim()) { Alert.alert('Error', 'Template name required'); return; }
    if (!form.symbol.trim())        { Alert.alert('Error', 'Symbol required'); return; }
    saveMut.mutate({
      accountId:    accountId!,
      templateName: form.templateName,
      symbol:       form.symbol.toUpperCase(),
      exchange:     form.exchange,
      side:         form.side,
      orderType:    form.orderType,
      timeInForce:  form.timeInForce,
      quantity:     form.quantity ? parseInt(form.quantity) : undefined,
      price:        form.price    ? parseFloat(form.price)  : undefined,
      stopPrice:    form.stopPrice? parseFloat(form.stopPrice) : undefined,
    } as any);
  };

  if (isLoading) return <LoadingView message="Loading templates…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  return (
    <View style={styles.root}>
      <FlatList
        data={data ?? []}
        keyExtractor={t => t.id}
        contentContainerStyle={{ padding: Spacing.base, paddingBottom: 100, gap: Spacing.sm }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color={Colors.text.muted} />
            <Text style={styles.emptyText}>No templates saved</Text>
            <Text style={styles.emptyHint}>Save frequently used order configs for one-tap execution</Text>
          </View>
        }
        renderItem={({ item: t }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={[styles.sideTag, { backgroundColor: t.side === 'BUY' ? Colors.bull + '22' : Colors.bear + '22' }]}>
                <Text style={[styles.sideTagText, { color: t.side === 'BUY' ? Colors.bull : Colors.bear }]}>{t.side}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{t.templateName}</Text>
                <Text style={styles.cardDetail}>
                  {t.symbol} · {t.exchange} · {t.orderType} · {t.timeInForce}
                </Text>
                <Text style={styles.cardParams}>
                  {t.quantity ? `${t.quantity} shares` : 'No qty'}
                  {t.price ? ` @ ৳${formatPrice(t.price)}` : ''}
                  {t.stopPrice ? ` stop ৳${formatPrice(t.stopPrice)}` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.useBtn} onPress={() => onUse(t)} activeOpacity={0.8}>
                <Text style={styles.useBtnText}>Use</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Alert.alert('Delete Template', `Delete "${t.templateName}"?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteMut.mutate({ id: t.id }) },
              ])}>
                <Ionicons name="trash-outline" size={18} color={Colors.bear} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Template</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <F label="Template Name">
              <TextInput style={styles.input} value={form.templateName} onChangeText={v => setForm(f => ({...f, templateName: v}))}
                placeholder="e.g. GP Morning Buy" placeholderTextColor={Colors.text.muted} />
            </F>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <F label="Symbol" style={{ flex: 2 }}>
                <TextInput style={styles.input} value={form.symbol} onChangeText={v => setForm(f => ({...f, symbol: v}))}
                  placeholder="GP" placeholderTextColor={Colors.text.muted} autoCapitalize="characters" />
              </F>
              <F label="Exchange" style={{ flex: 1 }}>
                <View style={styles.toggleRow}>
                  {['DSE','CSE'].map(ex => (
                    <TouchableOpacity key={ex} style={[styles.toggleOpt, form.exchange === ex && styles.activeOpt]}
                      onPress={() => setForm(f => ({...f, exchange: ex}))}>
                      <Text style={[styles.toggleText, form.exchange === ex && styles.activeText]}>{ex}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </F>
            </View>
            <F label="Side">
              <View style={styles.toggleRow}>
                {['BUY','SELL'].map(s => (
                  <TouchableOpacity key={s} style={[styles.toggleOpt,
                    form.side === s && { backgroundColor: s === 'BUY' ? Colors.bull : Colors.bear }]}
                    onPress={() => setForm(f => ({...f, side: s}))}>
                    <Text style={[styles.toggleText, form.side === s && { color: Colors.white }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </F>
            <F label="Order Type">
              <View style={styles.chipRow}>
                {ORDER_TYPES.map(t => (
                  <TouchableOpacity key={t} style={[styles.chip, form.orderType === t && styles.chipActive]}
                    onPress={() => setForm(f => ({...f, orderType: t}))}>
                    <Text style={[styles.chipText, form.orderType === t && styles.chipActiveText]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </F>
            <F label="Time In Force">
              <View style={styles.chipRow}>
                {TIF_OPTIONS.map(t => (
                  <TouchableOpacity key={t} style={[styles.chip, form.timeInForce === t && styles.chipActive]}
                    onPress={() => setForm(f => ({...f, timeInForce: t}))}>
                    <Text style={[styles.chipText, form.timeInForce === t && styles.chipActiveText]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </F>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <F label="Quantity" style={{ flex: 1 }}>
                <TextInput style={styles.input} value={form.quantity} onChangeText={v => setForm(f => ({...f, quantity: v}))}
                  placeholder="100" placeholderTextColor={Colors.text.muted} keyboardType="numeric" />
              </F>
              <F label="Price (BDT)" style={{ flex: 1 }}>
                <TextInput style={styles.input} value={form.price} onChangeText={v => setForm(f => ({...f, price: v}))}
                  placeholder="0.00" placeholderTextColor={Colors.text.muted} keyboardType="decimal-pad" />
              </F>
            </View>
            <TouchableOpacity style={[styles.submitBtn, saveMut.isPending && {opacity:0.6}]}
              onPress={onSubmit} disabled={saveMut.isPending}>
              <Text style={styles.submitText}>{saveMut.isPending ? 'Saving…' : 'Save Template'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function F({ label, children, style }: { label: string; children: React.ReactNode; style?: any }) {
  return <View style={[{ marginBottom: Spacing.sm }, style]}><Text style={styles.fieldLabel}>{label}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyText: { color: Colors.text.secondary, fontSize: Typography.size.base, fontWeight: '700' },
  emptyHint: { color: Colors.text.muted, fontSize: Typography.size.sm, textAlign: 'center', paddingHorizontal: 40 },

  card: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border.subtle, padding: Spacing.base,
  },
  cardLeft:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  sideTag:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, minWidth: 40, alignItems: 'center' },
  sideTagText: { fontSize: 11, fontWeight: '800' },
  cardInfo:    { flex: 1, gap: 2 },
  cardName:    { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '700' },
  cardDetail:  { color: Colors.text.secondary, fontSize: Typography.size.xs },
  cardParams:  { color: Colors.text.muted, fontSize: Typography.size.xs },
  cardActions: { flexDirection: 'column', alignItems: 'center', gap: Spacing.xs },
  useBtn:      { backgroundColor: Colors.accent.blue, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 5 },
  useBtnText:  { color: Colors.white, fontSize: Typography.size.xs, fontWeight: '800' },

  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56,
    borderRadius: 28, backgroundColor: Colors.accent.blue, alignItems: 'center', justifyContent: 'center', elevation: 6,
  },

  modal:       { flex: 1, backgroundColor: Colors.bg.primary },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border.subtle },
  modalTitle:  { color: Colors.text.primary, fontSize: Typography.size.lg, fontWeight: '800' },
  modalBody:   { padding: Spacing.base },
  fieldLabel:  { color: Colors.text.secondary, fontSize: Typography.size.sm, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: Colors.bg.secondary, borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    color: Colors.text.primary, fontSize: Typography.size.base,
  },
  toggleRow:  { flexDirection: 'row', borderWidth: 1, borderColor: Colors.border.default, borderRadius: BorderRadius.md, overflow: 'hidden' },
  toggleOpt:  { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', backgroundColor: Colors.bg.secondary },
  activeOpt:  { backgroundColor: Colors.accent.blue },
  toggleText: { color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '700' },
  activeText: { color: Colors.white },
  chipRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip:       { borderWidth: 1, borderColor: Colors.border.default, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 5 },
  chipActive: { borderColor: Colors.accent.blue, backgroundColor: Colors.accent.blue + '18' },
  chipText:   { color: Colors.text.secondary, fontSize: Typography.size.xs, fontWeight: '600' },
  chipActiveText: { color: Colors.accent.blue },
  submitBtn:  { backgroundColor: Colors.accent.blue, borderRadius: BorderRadius.md, paddingVertical: Spacing.base, alignItems: 'center', marginTop: Spacing.sm },
  submitText: { color: Colors.white, fontSize: Typography.size.base, fontWeight: '800' },
});
