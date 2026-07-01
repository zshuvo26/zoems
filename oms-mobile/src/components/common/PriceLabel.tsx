import React from 'react';
import { Text, View, StyleSheet, TextStyle } from 'react-native';
import { Colors, Typography } from '../../theme';
import { formatPrice, formatChangePct, formatChange, changeColor } from '../../utils/formatters';

interface PriceLabelProps {
  price: number;
  change?: number;
  changePct?: number;
  size?: 'sm' | 'md' | 'lg';
  style?: TextStyle;
}

export function PriceLabel({ price, change, changePct, size = 'md', style }: PriceLabelProps) {
  const priceSize = size === 'lg' ? 28 : size === 'md' ? 20 : 14;
  const changeSize = size === 'lg' ? 13 : size === 'md' ? 12 : 10;
  const color = change !== undefined ? changeColor(change) : Colors.text.primary;

  return (
    <View style={styles.container}>
      <Text style={[styles.price, { fontSize: priceSize }, style]}>
        {formatPrice(price)}
      </Text>
      {change !== undefined && (
        <View style={styles.changeRow}>
          <Text style={[styles.change, { fontSize: changeSize, color }]}>
            {formatChange(change)}
          </Text>
          {changePct !== undefined && (
            <Text style={[styles.change, { fontSize: changeSize, color }]}>
              {' '}({formatChangePct(changePct)})
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'flex-end' },
  price:     {
    ...Typography.styles.price,
    color: Colors.text.primary,
  },
  changeRow: { flexDirection: 'row', marginTop: 2 },
  change:    { fontFamily: Typography.fonts.mono, fontWeight: '600' },
});
