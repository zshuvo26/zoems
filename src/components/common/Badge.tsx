import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Typography } from '../../theme';

interface BadgeProps {
  label: string;
  color?: string;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

export function Badge({ label, color = Colors.accent.blue, style, size = 'md' }: BadgeProps) {
  return (
    <View style={[styles.badge, { borderColor: color }, size === 'sm' && styles.small, style]}>
      <Text style={[styles.text, { color }, size === 'sm' && styles.smallText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth:     1,
    borderRadius:    BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical:   2,
    alignSelf:       'flex-start',
  },
  text: {
    fontSize:   Typography.size.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  small: { paddingHorizontal: 4, paddingVertical: 1 },
  smallText: { fontSize: 9 },
});
