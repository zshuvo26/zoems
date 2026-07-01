import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Switch, Alert,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { basketApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import type { OrderRequest } from '../../types/api';

interface BasketRow {
  id: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  orderType: 'LIMIT' | 'MARKET';
  quantity: string;
  price: string;
}

export default function BasketScreen() {
  const nav = useNavigation<any>();
  const { accountId } = useAuthStore();

  const [basketName, setBasketName] = useState('');
  const [allOrNone,  setAllOrNone]  = useState(false);
  const [rows, setRows] = useState<BasketRow[]>([
    { id: 1, symbol: 'GP',         side: 'BUY', orderType: 'LIMIT', quantity: '', price: '' },
    { id: 2, symbol: 'SQURPHARMA', side: 'BUY', orderType: 'LIMIT', quantity: '', price: '' },
  ]);

  const mutation = useMutation({
    mutationFn: basketApi.submit,
    onSuccess: (result) => {
      Alert.alert(
        'Basket Submitted',
        `Accepted: ${result.accepted} / Rejected: ${result.rejected} / Total: ${result.totalOrders}`,
        [{ text: 'OK', onPress: () => nav.goBack() }],
      );
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const addRow = () => {
    setRows(r => [...r, { id: Date.now(), symbol: '', side: 'BUY', orderType: 'LIMIT', quantity: '', price: '' }]);
  };

  const removeRow = (id: number) => {
    setRows(r => r.filter(row => row.id !== id));
  };

  const updateRow = <K extends keyof BasketRow>(id: number, key: K, value: BasketRow[K]) => {
    setRows(r => r.map(row => row.id === id ? { ...row, [key]: value } : row));
  };

  const submit = () => {
    if (!basketName.trim()) { Alert.alert('Error', 'Enter a basket name'); return; }
    const orders: OrderRequest[] = rows
      .filter(r => r.symbol && r.quantity)
      .map(r => ({
        accountId:   accountId!,
        symbol:      r.symbol.toUpperCase(),
        exchange:    'DSE',
        side:        r.side,
        orderType:   r.orderType,
        quantity:    Number(r.quantity),
        price:       r.price ? Number(r.price) : undefined,
        source:      'MOBILE_BASKET',
      }));

    if (orders.length === 0) { Alert.alert('Error', 'Add at least one valid order'); return; }

    mutation.mutate({ basketName: basketName.trim(), accountId: accountId!, allOrNone, orders });
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.section}>
          <Text style={styles.label}>Basket Name</Text>
          <TextInput
            style={styles.input}
            value={basketName}
            onChangeText={setBasketName}
            placeholder="e.g. Q2 Rebalance"
            placeholderTextColor={Colors.text.muted}
          />
        </View>

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>All-or-None</Text>
            <Text style={styles.switchSub}>Reject all orders if any single order fails</Text>
          </View>
          <Switch
            value={allOrNone}
            onValueChange={setAllOrNone}
            trackColor={{ false: Colors.border.default, true: Colors.accent.blue }}
            thumbColor={Colors.white}
          />
        </View>

        {/* Order rows */}
        <Text style={styles.tableHeader}>Orders</Text>
        {rows.map((row, idx) => (
          <View key={row.id} style={styles.orderRow}>
            <View style={styles.rowTop}>
              <Text style={styles.rowIdx}>{idx + 1}</Text>
              <TextInput
                style={[styles.inputSm, styles.symbolInput]}
                value={row.symbol}
                onChangeText={v => updateRow(row.id, 'symbol', v.toUpperCase())}
                placeholder="Symbol"
                placeholderTextColor={Colors.text.muted}
                autoCapitalize="characters"
              />
              <View style={styles.sideMini}>
                {(['BUY', 'SELL'] as const).map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.sideMiniBtn, row.side === s && { backgroundColor: s === 'BUY' ? Colors.bull : Colors.bear }]}
                    onPress={() => updateRow(row.id, 'side', s)}
                  >
                    <Text style={[styles.sideMiniText, row.side === s && { color: Colors.white }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={() => removeRow(row.id)} style={styles.removeBtn}>
                <Ionicons name="close-circle" size={20} color={Colors.text.muted} />
              </TouchableOpacity>
            </View>
            <View style={styles.rowBottom}>
              <TextInput
                style={[styles.inputSm, styles.qtyInput]}
                value={row.quantity}
                onChangeText={v => updateRow(row.id, 'quantity', v)}
                placeholder="Qty"
                placeholderTextColor={Colors.text.muted}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.inputSm, styles.priceInput]}
                value={row.price}
                onChangeText={v => updateRow(row.id, 'price', v)}
                placeholder="Price (BDT)"
                placeholderTextColor={Colors.text.muted}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addRowBtn} onPress={addRow}>
          <Ionicons name="add-circle-outline" size={18} color={Colors.accent.blue} />
          <Text style={styles.addRowText}>Add Order</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerInfo}>{rows.filter(r => r.symbol && r.quantity).length} orders ready</Text>
        <TouchableOpacity
          style={[styles.submitBtn, mutation.isPending && styles.btnDisabled]}
          onPress={submit}
          disabled={mutation.isPending}
        >
          <Text style={styles.submitText}>{mutation.isPending ? 'Submitting…' : 'Submit Basket'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: Colors.bg.primary },
  scroll:{ padding: Spacing.base, paddingBottom: 100, gap: Spacing.base },

  section: { gap: 6 },
  label:   { color: Colors.text.secondary, fontSize: Typography.size.sm, fontWeight: '600' },
  input: {
    backgroundColor: Colors.bg.secondary, borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    color: Colors.text.primary, fontSize: Typography.size.base,
  },

  switchRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.md, padding: Spacing.base, borderWidth: 1, borderColor: Colors.border.subtle },
  switchLabel:{ color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700' },
  switchSub:  { color: Colors.text.muted, fontSize: Typography.size.xs },

  tableHeader:{ color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '700', letterSpacing: 1 },

  orderRow: {
    backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.md, borderWidth: 1,
    borderColor: Colors.border.subtle, padding: Spacing.sm, gap: Spacing.xs,
  },
  rowTop:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  rowBottom: { flexDirection: 'row', gap: Spacing.xs },
  rowIdx:    { color: Colors.text.muted, fontSize: 11, fontWeight: '700', width: 16 },

  inputSm: {
    backgroundColor: Colors.bg.tertiary, borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 5,
    color: Colors.text.primary, fontSize: Typography.size.sm,
  },
  symbolInput: { flex: 2 },
  qtyInput:    { flex: 1 },
  priceInput:  { flex: 2 },

  sideMini:    { flexDirection: 'row', borderRadius: BorderRadius.sm, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border.default },
  sideMiniBtn: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: Colors.bg.secondary },
  sideMiniText:{ color: Colors.text.muted, fontSize: 10, fontWeight: '800' },

  removeBtn: { padding: 2 },

  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, padding: Spacing.sm, justifyContent: 'center' },
  addRowText:{ color: Colors.accent.blue, fontSize: Typography.size.sm, fontWeight: '600' },

  footer:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.base, backgroundColor: Colors.bg.secondary, borderTopWidth: 1, borderTopColor: Colors.border.default },
  footerInfo: { color: Colors.text.muted, fontSize: Typography.size.xs, flex: 1 },
  submitBtn:  { backgroundColor: Colors.accent.blue, borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl },
  btnDisabled:{ opacity: 0.6 },
  submitText: { color: Colors.white, fontSize: Typography.size.sm, fontWeight: '800' },
});
