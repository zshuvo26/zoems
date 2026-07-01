import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Typography } from '../../theme';

interface Props {
  label: string;
  active?: boolean;
  onPress: () => void;
  color?: string;
  style?: ViewStyle;
}

export function PillButton({ label, active, onPress, color = Colors.accent.blue, style }: Props) {
  return (
    <TouchableOpacity
      style={[styles.pill, active && { backgroundColor: color, borderColor: color }, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth:     1,
    borderColor:     Colors.border.default,
    borderRadius:    BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical:   6,
  },
  text: {
    color:    Colors.text.secondary,
    fontSize: Typography.size.xs,
    fontWeight: '600',
  },
  textActive: {
    color: Colors.white,
  },
});
