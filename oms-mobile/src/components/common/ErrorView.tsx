import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../theme';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export function ErrorView({ message = 'Something went wrong', onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="warning-outline" size={40} color={Colors.bear} />
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.btn} onPress={onRetry}>
          <Text style={styles.btnText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.primary,
    padding:        Spacing['2xl'],
    gap:            Spacing.base,
  },
  message: {
    color:     Colors.text.secondary,
    fontSize:  Typography.size.base,
    textAlign: 'center',
  },
  btn: {
    marginTop:       Spacing.sm,
    backgroundColor: Colors.accent.blue,
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.sm,
    borderRadius:    20,
  },
  btnText: {
    color:      Colors.white,
    fontWeight: '600',
    fontSize:   Typography.size.base,
  },
});
