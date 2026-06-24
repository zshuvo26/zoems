import React from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../../theme';

export function LoadingView({ message = 'Loading…' }: { message?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.accent.blue} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.primary,
    gap:            Spacing.md,
  },
  text: {
    color:    Colors.text.secondary,
    fontSize: Typography.size.sm,
  },
});
