import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../../theme';

interface StatRowProps {
  label: string;
  value: string | React.ReactNode;
  valueColor?: string;
}

export function StatRow({ label, value, valueColor }: StatRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {typeof value === 'string' ? (
        <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingVertical: Spacing.xs,
  },
  label: {
    color:    Colors.text.secondary,
    fontSize: Typography.size.sm,
  },
  value: {
    color:      Colors.text.primary,
    fontSize:   Typography.size.sm,
    fontWeight: '600',
    fontFamily: Typography.fonts.mono,
  },
});
