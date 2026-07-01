import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing, Shadow } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  noPadding?: boolean;
}

export function Card({ children, style, elevated, noPadding }: CardProps) {
  return (
    <View style={[
      styles.card,
      elevated && styles.elevated,
      noPadding && styles.noPadding,
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.secondary,
    borderRadius:    BorderRadius.lg,
    borderWidth:     1,
    borderColor:     Colors.border.subtle,
    padding:         Spacing.base,
  },
  elevated: {
    ...Shadow.card,
    backgroundColor: Colors.bg.elevated,
  },
  noPadding: {
    padding: 0,
    overflow: 'hidden',
  },
});
