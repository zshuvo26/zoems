import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography } from '../../theme';
import { useAuthStore } from '../../store/auth';

export default function SplashScreen() {
  const { initialize } = useAuthStore();
  const opacity  = new Animated.Value(0);
  const scale    = new Animated.Value(0.85);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scale,   { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(initialize, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Animated.View style={[styles.logoArea, { opacity, transform: [{ scale }] }]}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>OMS</Text>
        </View>
        <Text style={styles.title}>Bangladesh OMS</Text>
        <Text style={styles.sub}>Professional Trading Platform</Text>
        <View style={styles.exchangeBadges}>
          <View style={styles.badge}><Text style={styles.badgeText}>DSE</Text></View>
          <View style={styles.badge}><Text style={styles.badgeText}>CSE</Text></View>
        </View>
      </Animated.View>
      <Text style={styles.powered}>Powered by FIX 4.4 Protocol</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: Colors.bg.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  logoArea:  { alignItems: 'center', gap: 12 },
  logoBox: {
    width:           80,
    height:          80,
    backgroundColor: Colors.accent.blue,
    borderRadius:    22,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    8,
  },
  logoText: {
    color:      Colors.white,
    fontSize:   24,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color:      Colors.text.primary,
    fontSize:   Typography.size.xl,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  sub: {
    color:    Colors.text.secondary,
    fontSize: Typography.size.sm,
  },
  exchangeBadges: { flexDirection: 'row', gap: 8, marginTop: 8 },
  badge: {
    borderWidth:   1,
    borderColor:   Colors.border.default,
    borderRadius:  6,
    paddingHorizontal: 10,
    paddingVertical:    4,
  },
  badgeText: { color: Colors.text.secondary, fontSize: 11, fontWeight: '700' },
  powered: {
    position: 'absolute',
    bottom:   40,
    color:    Colors.text.muted,
    fontSize: Typography.size.xs,
  },
});
