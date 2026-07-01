import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { algoApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import type { TradeStackProps } from '../../navigation/types';

const ALGO_TYPES = ['TWAP', 'VWAP', 'POV', 'IS', 'ICEBERG'] as const;

const ALGO_DESC: Record<string, string> = {
  TWAP:    'Time-Weighted Average Price — equal slices over time',
  VWAP:    'Volume-Weighted Average Price — front-loaded by volume profile',
  POV:     'Participate % of market volume continuously',
  IS:      'Implementation Shortfall — minimize market impact',
  ICEBERG: 'Show small visible qty, hide full size',
};

const schema = z.object({
  accountId:             z.string().min(1),
  symbol:                z.string().min(1).toUpperCase(),
  exchange:              z.enum(['DSE', 'CSE']),
  side:                  z.enum(['BUY', 'SELL']),
  algoType:              z.enum(['TWAP', 'VWAP', 'POV', 'IS', 'ICEBERG']),
  totalQuantity:         z.coerce.number().positive().int(),
  priceLimit:            z.coerce.number().optional(),
  participationRate:     z.coerce.number().min(0.01).max(0.50).optional(),
  sliceIntervalSeconds:  z.coerce.number().positive().int(),
});
type Form = z.infer<typeof schema>;

export default function NewAlgoScreen({ route, navigation }: TradeStackProps<'NewAlgoOrder'>) {
  const { symbol: defaultSymbol, exchange: defaultExchange } = route.params ?? {};
  const { accountId } = useAuthStore();
  const qc = useQueryClient();

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      accountId,
      symbol:               defaultSymbol ?? '',
      exchange:             (defaultExchange as any) ?? 'DSE',
      side:                 'BUY',
      algoType:             'TWAP',
      sliceIntervalSeconds: 300,
    },
  });

  const watchedSide = watch('side');
  const watchedType = watch('algoType');

  const mutation = useMutation({
    mutationFn: algoApi.create,
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['algo'] });
      Alert.alert('Algo Started', `${watchedType} order submitted`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.root}>
        {/* Side */}
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

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Algo Type */}
          <Text style={styles.sectionLabel}>Strategy</Text>
          <View style={styles.algoGrid}>
            {ALGO_TYPES.map(t => (
              <Controller key={t} control={control} name="algoType" render={({ field }) => (
                <TouchableOpacity
                  style={[styles.algoCard, field.value === t && styles.algoCardActive]}
                  onPress={() => field.onChange(t)}
                >
                  <Text style={[styles.algoName, field.value === t && styles.algoNameActive]}>{t}</Text>
                  <Text style={styles.algoDesc} numberOfLines={2}>{ALGO_DESC[t]}</Text>
                </TouchableOpacity>
              )} />
            ))}
          </View>

          {/* Inputs */}
          {[
            { name: 'symbol' as const, label: 'Symbol', placeholder: 'GP', caps: 'characters' as const },
            { name: 'accountId' as const, label: 'BO Account', placeholder: accountId, caps: 'none' as const, keyboard: 'numeric' as const },
          ].map(f => (
            <View key={f.name} style={styles.field}>
              <Text style={styles.label}>{f.label}</Text>
              <Controller control={control} name={f.name} render={({ field }) => (
                <TextInput style={styles.input} value={field.value as string} onChangeText={field.onChange} placeholder={f.placeholder} placeholderTextColor={Colors.text.muted} autoCapitalize={f.caps} keyboardType={f.keyboard} />
              )} />
            </View>
          ))}

          {/* Exchange */}
          <View style={styles.field}>
            <Text style={styles.label}>Exchange</Text>
            <View style={styles.toggle}>
              {(['DSE', 'CSE'] as const).map(ex => (
                <Controller key={ex} control={control} name="exchange" render={({ field }) => (
                  <TouchableOpacity style={[styles.toggleOpt, field.value === ex && styles.toggleOptActive]} onPress={() => field.onChange(ex)}>
                    <Text style={[styles.toggleText, field.value === ex && styles.toggleTextActive]}>{ex}</Text>
                  </TouchableOpacity>
                )} />
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Total Quantity</Text>
            <Controller control={control} name="totalQuantity" render={({ field }) => (
              <TextInput style={styles.input} value={field.value ? String(field.value) : ''} onChangeText={field.onChange} placeholder="1000" placeholderTextColor={Colors.text.muted} keyboardType="numeric" />
            )} />
            {errors.totalQuantity && <Text style={styles.error}>{errors.totalQuantity.message}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Price Limit (optional)</Text>
            <Controller control={control} name="priceLimit" render={({ field }) => (
              <TextInput style={styles.input} value={field.value ? String(field.value) : ''} onChangeText={field.onChange} placeholder="Leave blank for no limit" placeholderTextColor={Colors.text.muted} keyboardType="decimal-pad" />
            )} />
          </View>

          {watchedType === 'POV' && (
            <View style={styles.field}>
              <Text style={styles.label}>Participation Rate (1–50%)</Text>
              <Controller control={control} name="participationRate" render={({ field }) => (
                <TextInput style={styles.input} value={field.value ? String(field.value) : ''} onChangeText={field.onChange} placeholder="0.15 = 15%" placeholderTextColor={Colors.text.muted} keyboardType="decimal-pad" />
              )} />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Slice Interval (seconds)</Text>
            <Controller control={control} name="sliceIntervalSeconds" render={({ field }) => (
              <TextInput style={styles.input} value={field.value ? String(field.value) : ''} onChangeText={field.onChange} placeholder="300" placeholderTextColor={Colors.text.muted} keyboardType="numeric" />
            )} />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: watchedSide === 'BUY' ? Colors.bull : Colors.bear }, mutation.isPending && styles.btnDisabled]}
            onPress={handleSubmit(d => mutation.mutate(d as any))}
            disabled={mutation.isPending}
          >
            <Text style={styles.submitText}>{mutation.isPending ? 'Starting…' : `Start ${watchedType} ${watchedSide}`}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: Colors.bg.primary },
  scroll:{ padding: Spacing.base, paddingBottom: 100 },

  sideToggle: { flexDirection: 'row', margin: Spacing.base, borderRadius: BorderRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border.default },
  sideBtn:    { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', backgroundColor: Colors.bg.secondary },
  buyActive:  { backgroundColor: Colors.bull },
  sellActive: { backgroundColor: Colors.bear },
  sideBtnText:{ color: Colors.text.secondary, fontSize: Typography.size.base, fontWeight: '700' },
  sideBtnTextActive: { color: Colors.white },

  sectionLabel: { color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '700', letterSpacing: 1, marginBottom: Spacing.sm },
  algoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.base },
  algoCard: {
    width: '48%',
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: 4,
  },
  algoCardActive: { borderColor: Colors.accent.blue, backgroundColor: Colors.accent.blue + '11' },
  algoName:       { color: Colors.text.secondary, fontSize: Typography.size.sm, fontWeight: '800' },
  algoNameActive: { color: Colors.accent.blue },
  algoDesc:       { color: Colors.text.muted, fontSize: 10 },

  field: { marginBottom: Spacing.sm },
  label: { color: Colors.text.secondary, fontSize: Typography.size.sm, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: Colors.bg.secondary, borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    color: Colors.text.primary, fontSize: Typography.size.base,
  },
  error: { color: Colors.bear, fontSize: Typography.size.xs, marginTop: 2 },

  toggle: { flexDirection: 'row', borderWidth: 1, borderColor: Colors.border.default, borderRadius: BorderRadius.md, overflow: 'hidden' },
  toggleOpt: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', backgroundColor: Colors.bg.secondary },
  toggleOptActive: { backgroundColor: Colors.accent.blue },
  toggleText: { color: Colors.text.muted, fontSize: Typography.size.sm, fontWeight: '700' },
  toggleTextActive: { color: Colors.white },

  footer:    { padding: Spacing.base, backgroundColor: Colors.bg.secondary, borderTopWidth: 1, borderTopColor: Colors.border.default },
  submitBtn: { borderRadius: BorderRadius.md, paddingVertical: Spacing.base, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  submitText:{ color: Colors.white, fontSize: Typography.size.base, fontWeight: '800', letterSpacing: 0.5 },
});
