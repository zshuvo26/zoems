import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatBDT, formatPrice } from '../../utils/formatters';

// Bangladesh DSE/CSE fee structure
const FEE = {
  brokerage:   0.005,
  secLevy:     0.0005,
  cdbl:        0.00015,
  exchange:    0.00005,
  ait:         0.001,   // on sell only
  stampBuy:    0.00015, // on buy only
};

function calcFees(side: 'BUY' | 'SELL', price: number, qty: number) {
  const val      = price * qty;
  const brokerage = val * FEE.brokerage;
  const sec       = val * FEE.secLevy;
  const cdbl      = val * FEE.cdbl;
  const exchange  = val * FEE.exchange;
  const ait       = side === 'SELL' ? val * FEE.ait   : 0;
  const stamp     = side === 'BUY'  ? val * FEE.stampBuy : 0;
  const total     = brokerage + sec + cdbl + exchange + ait + stamp;
  const net       = side === 'BUY' ? val + total : val - total;
  return { val, brokerage, sec, cdbl, exchange, ait, stamp, total, net };
}

export default function ProfitCalculatorScreen() {
  const [buyPrice,  setBuyPrice]  = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [qty,       setQty]       = useState('');

  const bp = parseFloat(buyPrice)  || 0;
  const sp = parseFloat(sellPrice) || 0;
  const q  = parseInt(qty)         || 0;

  const buy  = useMemo(() => bp > 0 && q > 0 ? calcFees('BUY',  bp, q) : null, [bp, q]);
  const sell = useMemo(() => sp > 0 && q > 0 ? calcFees('SELL', sp, q) : null, [sp, q]);

  const grossPnL  = buy && sell ? sell.val - buy.val : null;
  const totalCost = buy && sell ? buy.total + sell.total : null;
  const netPnL    = grossPnL !== null && totalCost !== null ? grossPnL - totalCost : null;
  const netPnLPct = netPnL !== null && buy ? (netPnL / buy.net) * 100 : null;
  const breakEven = buy ? (buy.net / (q || 1)) * (1 / (1 - FEE.brokerage - FEE.secLevy - FEE.cdbl - FEE.exchange - FEE.ait)) : null;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
      {/* Input section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trade Parameters</Text>

        <View style={styles.inputRow}>
          <Field label="Buy Price (BDT)" style={{ flex: 1 }}>
            <TextInput style={styles.input} value={buyPrice} onChangeText={setBuyPrice}
              placeholder="0.00" placeholderTextColor={Colors.text.muted} keyboardType="decimal-pad" />
          </Field>
          <Field label="Quantity" style={{ flex: 1 }}>
            <TextInput style={styles.input} value={qty} onChangeText={setQty}
              placeholder="100" placeholderTextColor={Colors.text.muted} keyboardType="numeric" />
          </Field>
        </View>

        <Field label="Target Sell Price (BDT)">
          <TextInput style={styles.input} value={sellPrice} onChangeText={setSellPrice}
            placeholder="0.00" placeholderTextColor={Colors.text.muted} keyboardType="decimal-pad" />
        </Field>
      </View>

      {/* Result */}
      {netPnL !== null && (
        <View style={[styles.resultCard, { borderColor: (netPnL >= 0 ? Colors.bull : Colors.bear) + '44' }]}>
          <View style={styles.resultTop}>
            <Text style={styles.resultLabel}>Net Profit / Loss</Text>
            <Ionicons name={netPnL >= 0 ? 'trending-up' : 'trending-down'} size={22} color={netPnL >= 0 ? Colors.bull : Colors.bear} />
          </View>
          <Text style={[styles.resultAmount, { color: netPnL >= 0 ? Colors.bull : Colors.bear }]}>
            {netPnL >= 0 ? '+' : ''}{formatBDT(netPnL)}
          </Text>
          <Text style={[styles.resultPct, { color: netPnL >= 0 ? Colors.bull : Colors.bear }]}>
            {netPnLPct !== null ? `${netPnLPct >= 0 ? '+' : ''}${netPnLPct.toFixed(2)}% return` : ''}
          </Text>
        </View>
      )}

      {/* Buy cost breakdown */}
      {buy && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Buy Cost Breakdown</Text>
          <FeeRow label="Trade Value"    value={buy.val}       />
          <FeeRow label="Brokerage 0.5%" value={buy.brokerage} dim />
          <FeeRow label="SEC Levy 0.05%" value={buy.sec}       dim />
          <FeeRow label="CDBL 0.015%"    value={buy.cdbl}      dim />
          <FeeRow label="Exchange 0.005%"value={buy.exchange}  dim />
          <FeeRow label="Stamp Duty 0.015%"value={buy.stamp}   dim />
          <View style={styles.divider} />
          <FeeRow label="Total Fees"     value={buy.total}     bold />
          <FeeRow label="Total Cost (Net)" value={buy.net}     bold color={Colors.bear} />
        </View>
      )}

      {/* Sell proceeds breakdown */}
      {sell && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sell Proceeds Breakdown</Text>
          <FeeRow label="Trade Value"    value={sell.val}       />
          <FeeRow label="Brokerage 0.5%" value={sell.brokerage} dim />
          <FeeRow label="SEC Levy 0.05%" value={sell.sec}       dim />
          <FeeRow label="CDBL 0.015%"    value={sell.cdbl}      dim />
          <FeeRow label="Exchange 0.005%"value={sell.exchange}  dim />
          <FeeRow label="AIT 0.1%"       value={sell.ait}       dim />
          <View style={styles.divider} />
          <FeeRow label="Total Fees"     value={sell.total}     bold />
          <FeeRow label="Net Proceeds"   value={sell.net}       bold color={Colors.bull} />
        </View>
      )}

      {/* Break-even */}
      {breakEven !== null && q > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Break-Even Analysis</Text>
          <FeeRow label="Break-Even Price" value={breakEven} />
          <View style={styles.breakInfo}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.text.muted} />
            <Text style={styles.breakText}>
              You need to sell above {formatPrice(breakEven)} to cover all buy-side costs.
            </Text>
          </View>
        </View>
      )}

      {/* Multi-scenario */}
      {buy && bp > 0 && q > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Scenario Analysis</Text>
          <View style={styles.scenHeader}>
            <Text style={styles.scenCol}>Exit Price</Text>
            <Text style={styles.scenCol}>Return %</Text>
            <Text style={styles.scenCol}>Net P&L</Text>
          </View>
          {[-10,-5,-2,2,5,10,15,20].map(pct => {
            const exitPrice = bp * (1 + pct / 100);
            const s         = calcFees('SELL', exitPrice, q);
            const pnl       = s.net - buy.net;
            const retPct    = (pnl / buy.net) * 100;
            return (
              <View key={pct} style={[styles.scenRow, { backgroundColor: pnl >= 0 ? Colors.bull + '08' : Colors.bear + '08' }]}>
                <Text style={[styles.scenCol, { color: Colors.text.primary, fontFamily: 'monospace' }]}>{formatPrice(exitPrice)}</Text>
                <Text style={[styles.scenCol, { color: pnl >= 0 ? Colors.bull : Colors.bear, fontWeight: '700' }]}>{retPct.toFixed(1)}%</Text>
                <Text style={[styles.scenCol, { color: pnl >= 0 ? Colors.bull : Colors.bear, fontWeight: '700', fontFamily: 'monospace' }]}>
                  {pnl >= 0 ? '+' : ''}{formatBDT(pnl)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: any }) {
  return (
    <View style={[{ marginBottom: Spacing.sm }, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function FeeRow({ label, value, dim, bold, color }: { label: string; value: number; dim?: boolean; bold?: boolean; color?: string }) {
  return (
    <View style={styles.feeRow}>
      <Text style={[styles.feeLabel, dim && { color: Colors.text.muted }, bold && { fontWeight: '700' }]}>{label}</Text>
      <Text style={[styles.feeValue, dim && { color: Colors.text.muted }, bold && { fontWeight: '800' }, color ? { color } : {}]}>
        {formatBDT(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  card: {
    backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border.subtle, padding: Spacing.base,
    marginBottom: Spacing.base, gap: 4,
  },
  cardTitle:  { color: Colors.text.secondary, fontSize: Typography.size.sm, fontWeight: '700', marginBottom: Spacing.xs },
  inputRow:   { flexDirection: 'row', gap: Spacing.sm },
  fieldLabel: { color: Colors.text.secondary, fontSize: Typography.size.xs, fontWeight: '600', marginBottom: 4 },
  input: {
    backgroundColor: Colors.bg.primary, borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm,
    color: Colors.text.primary, fontSize: Typography.size.base, fontFamily: 'monospace',
  },
  resultCard: {
    backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.lg, borderWidth: 2,
    padding: Spacing.base, marginBottom: Spacing.base, gap: 4,
  },
  resultTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultLabel: { color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '700', letterSpacing: 0.5 },
  resultAmount:{ fontSize: 28, fontWeight: '800', fontFamily: 'monospace' },
  resultPct:   { fontSize: Typography.size.sm, fontWeight: '700' },

  feeRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  feeLabel: { color: Colors.text.secondary, fontSize: Typography.size.xs },
  feeValue: { color: Colors.text.secondary, fontSize: Typography.size.xs, fontFamily: 'monospace' },
  divider:  { height: 1, backgroundColor: Colors.border.subtle, marginVertical: 4 },

  breakInfo: { flexDirection: 'row', gap: 4, marginTop: 4 },
  breakText: { color: Colors.text.muted, fontSize: 11, flex: 1 },

  scenHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border.subtle, paddingBottom: 4, marginBottom: 2 },
  scenRow:    { flexDirection: 'row', paddingVertical: 3, borderRadius: 4, paddingHorizontal: 2 },
  scenCol:    { flex: 1, fontSize: Typography.size.xs, color: Colors.text.muted, textAlign: 'right' },
});
