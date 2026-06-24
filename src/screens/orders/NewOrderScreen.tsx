import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatBDT } from '../../utils/formatters';
import type { TradeStackProps } from '../../navigation/types';

const schema = z.object({
  accountId:   z.string().min(1, 'Required'),
  symbol:      z.string().min(1, 'Required').toUpperCase(),
  exchange:    z.enum(['DSE', 'CSE']),
  side:        z.enum(['BUY', 'SELL']),
  orderType:   z.enum(['LIMIT', 'MARKET', 'STOP_LIMIT', 'STOP_LOSS']),
  timeInForce: z.enum(['DAY', 'GTC', 'IOC', 'FOK']),
  quantity:    z.coerce.number().positive('Must be > 0').int('Must be whole number'),
  price:       z.coerce.number().optional(),
  stopPrice:   z.coerce.number().optional(),
});
type Form = z.infer<typeof schema>;

const ORDER_TYPES = ['LIMIT', 'MARKET', 'STOP_LIMIT', 'STOP_LOSS'] as const;
const TIF_OPTIONS = ['DAY', 'GTC', 'IOC', 'FOK'] as const;

export default function NewOrderScreen({ route, navigation }: TradeStackProps<'NewOrder'>) {
  const { symbol: defaultSymbol, exchange: defaultExchange, side: defaultSide } = route.params ?? {};
  const { accountId } = useAuthStore();
  const queryClient = useQueryClient();
  const [estimatedValue, setEstimatedValue] = useState<number | null>(null);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      accountId:   accountId,
      symbol:      defaultSymbol ?? '',
      exchange:    (defaultExchange as any) ?? 'DSE',
      side:        (defaultSide as any) ?? 'BUY',
      orderType:   'LIMIT',
      timeInForce: 'DAY',
      quantity:    0,
    },
  });

  const watchedSide  = watch('side');
  const watchedType  = watch('orderType');
  const watchedPrice = watch('price');
  const watchedQty   = watch('quantity');
  const isBuy        = watchedSide === 'BUY';
  const needsPrice   = watchedType === 'LIMIT' || watchedType === 'STOP_LIMIT';

  React.useEffect(() => {
    if (watchedPrice && watchedQty) {
      setEstimatedValue(watchedPrice * watchedQty);
    }
  }, [watchedPrice, watchedQty]);

  const mutation = useMutation({
    mutationFn: ordersApi.submit,
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['openOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      Alert.alert(
        'Order Submitted',
        `${order.side} ${order.quantity} ${order.symbol} — Status: ${order.status}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    },
    onError: (e: any) => {
      Alert.alert('Order Failed', e.message ?? 'Submission failed');
    },
  });

  const onSubmit = (data: Form) => {
    mutation.mutate({
      ...data,
      price:     needsPrice ? data.price : undefined,
      stopPrice: (data.orderType === 'STOP_LIMIT' || data.orderType === 'STOP_LOSS') ? data.stopPrice : undefined,
      source:    'MOBILE',
    });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.root}>
        {/* Side Toggle */}
        <View style={styles.sideToggle}>
          {(['BUY', 'SELL'] as const).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.sideBtn, watchedSide === s && (s === 'BUY' ? styles.buyActive : styles.sellActive)]}
              onPress={() => setValue('side', s)}
            >
              <Text style={[styles.sideBtnText, watchedSide === s && styles.sideBtnTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Symbol & Exchange */}
          <View style={styles.row2}>
            <FormField label="Symbol" error={errors.symbol?.message} style={{ flex: 2 }}>
              <Controller control={control} name="symbol" render={({ field }) => (
                <TextInput style={styles.input} value={field.value} onChangeText={field.onChange} placeholder="GP" placeholderTextColor={Colors.text.muted} autoCapitalize="characters" />
              )} />
            </FormField>
            <FormField label="Exchange" error={errors.exchange?.message} style={{ flex: 1 }}>
              <View style={styles.toggleSmall}>
                {(['DSE', 'CSE'] as const).map(ex => (
                  <Controller key={ex} control={control} name="exchange" render={({ field }) => (
                    <TouchableOpacity style={[styles.toggleSmallOpt, field.value === ex && styles.toggleSmallOptActive]} onPress={() => field.onChange(ex)}>
                      <Text style={[styles.toggleSmallText, field.value === ex && styles.toggleSmallTextActive]}>{ex}</Text>
                    </TouchableOpacity>
                  )} />
                ))}
              </View>
            </FormField>
          </View>

          {/* Order Type */}
          <FormField label="Order Type">
            <View style={styles.chipGroup}>
              {ORDER_TYPES.map(t => (
                <Controller key={t} control={control} name="orderType" render={({ field }) => (
                  <TouchableOpacity style={[styles.chip, field.value === t && styles.chipActive]} onPress={() => field.onChange(t)}>
                    <Text style={[styles.chipText, field.value === t && styles.chipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                )} />
              ))}
            </View>
          </FormField>

          {/* Quantity */}
          <FormField label="Quantity" error={errors.quantity?.message}>
            <Controller control={control} name="quantity" render={({ field }) => (
              <TextInput style={styles.input} value={field.value ? String(field.value) : ''} onChangeText={field.onChange} placeholder="0" placeholderTextColor={Colors.text.muted} keyboardType="numeric" />
            )} />
          </FormField>

          {/* Price (conditional) */}
          {needsPrice && (
            <FormField label="Limit Price (BDT)" error={errors.price?.message}>
              <Controller control={control} name="price" render={({ field }) => (
                <TextInput style={styles.input} value={field.value ? String(field.value) : ''} onChangeText={field.onChange} placeholder="0.00" placeholderTextColor={Colors.text.muted} keyboardType="decimal-pad" />
              )} />
            </FormField>
          )}

          {/* Stop Price (conditional) */}
          {(watchedType === 'STOP_LIMIT' || watchedType === 'STOP_LOSS') && (
            <FormField label="Stop Price (BDT)" error={errors.stopPrice?.message}>
              <Controller control={control} name="stopPrice" render={({ field }) => (
                <TextInput style={styles.input} value={field.value ? String(field.value) : ''} onChangeText={field.onChange} placeholder="0.00" placeholderTextColor={Colors.text.muted} keyboardType="decimal-pad" />
              )} />
            </FormField>
          )}

          {/* Time In Force */}
          <FormField label="Time In Force">
            <View style={styles.chipGroup}>
              {TIF_OPTIONS.map(t => (
                <Controller key={t} control={control} name="timeInForce" render={({ field }) => (
                  <TouchableOpacity style={[styles.chip, field.value === t && styles.chipActive]} onPress={() => field.onChange(t)}>
                    <Text style={[styles.chipText, field.value === t && styles.chipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                )} />
              ))}
            </View>
          </FormField>

          {/* Account ID */}
          <FormField label="BO Account" error={errors.accountId?.message}>
            <Controller control={control} name="accountId" render={({ field }) => (
              <TextInput style={styles.input} value={field.value} onChangeText={field.onChange} placeholder="1201880012345678" placeholderTextColor={Colors.text.muted} keyboardType="numeric" />
            )} />
          </FormField>

          {/* Estimated Value */}
          {estimatedValue !== null && needsPrice && (
            <View style={styles.estimateBox}>
              <Text style={styles.estimateLabel}>Estimated {isBuy ? 'Cost' : 'Proceeds'}</Text>
              <Text style={styles.estimateValue}>{formatBDT(estimatedValue)}</Text>
              <Text style={styles.estimateFees}>+ brokerage 0.5% + SEC levy 0.05%{!isBuy ? ' + AIT 0.1%' : ''}</Text>
            </View>
          )}
        </ScrollView>

        {/* Submit */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: isBuy ? Colors.bull : Colors.bear }, mutation.isPending && styles.btnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={mutation.isPending}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>
              {mutation.isPending ? 'Submitting…' : `Place ${watchedSide} Order`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function FormField({ label, error, children, style }: { label: string; error?: string; children: React.ReactNode; style?: any }) {
  return (
    <View style={[{ gap: 6, marginBottom: Spacing.sm }, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.base, paddingBottom: 100 },

  sideToggle: { flexDirection: 'row', margin: Spacing.base, borderRadius: BorderRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border.default },
  sideBtn:    { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', backgroundColor: Colors.bg.tertiary },
  buyActive:  { backgroundColor: Colors.bull },
  sellActive: { backgroundColor: Colors.bear },
  sideBtnText:{ color: Colors.text.secondary, fontSize: Typography.size.base, fontWeight: '700' },
  sideBtnTextActive: { color: Colors.white },

  row2: { flexDirection: 'row', gap: Spacing.sm },

  input: {
    backgroundColor: Colors.bg.secondary,
    borderWidth:     1,
    borderColor:     Colors.border.default,
    borderRadius:    BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical:   Spacing.sm,
    color:           Colors.text.primary,
    fontSize:        Typography.size.base,
  },

  toggleSmall: { flexDirection: 'row', borderWidth: 1, borderColor: Colors.border.default, borderRadius: BorderRadius.md, overflow: 'hidden' },
  toggleSmallOpt: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', backgroundColor: Colors.bg.secondary },
  toggleSmallOptActive: { backgroundColor: Colors.accent.blue },
  toggleSmallText: { color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '700' },
  toggleSmallTextActive: { color: Colors.white },

  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip:     { borderWidth: 1, borderColor: Colors.border.default, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 5 },
  chipActive:{ borderColor: Colors.accent.blue, backgroundColor: Colors.accent.blue + '22' },
  chipText: { color: Colors.text.secondary, fontSize: Typography.size.xs, fontWeight: '600' },
  chipTextActive: { color: Colors.accent.blue },

  fieldLabel: { color: Colors.text.secondary, fontSize: Typography.size.sm, fontWeight: '600' },
  fieldError: { color: Colors.bear, fontSize: Typography.size.xs },

  estimateBox: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.base,
    gap: 4,
  },
  estimateLabel: { color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '600', letterSpacing: 0.5 },
  estimateValue: { color: Colors.text.primary, fontSize: Typography.size.xl, fontWeight: '800', fontFamily: 'monospace' },
  estimateFees:  { color: Colors.text.muted, fontSize: Typography.size.xs },

  footer: { padding: Spacing.base, backgroundColor: Colors.bg.secondary, borderTopWidth: 1, borderTopColor: Colors.border.default },
  submitBtn: { borderRadius: BorderRadius.md, paddingVertical: Spacing.base, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: Colors.white, fontSize: Typography.size.base, fontWeight: '800', letterSpacing: 0.5 },
});
