import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../../theme';

export function Separator() {
  return <View style={styles.sep} />;
}

const styles = StyleSheet.create({
  sep: { height: 1, backgroundColor: Colors.border.subtle, marginVertical: 4 },
});
