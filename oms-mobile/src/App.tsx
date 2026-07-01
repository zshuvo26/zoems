import React, { Component } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { queryClient } from './lib/queryClient';
import RootNavigator from './navigation';

// ── Global error boundary — prevents the entire app from crashing ─────────────
interface ErrorBoundaryState { hasError: boolean; error: string }

class ErrorBoundary extends Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: '' };

  static getDerivedStateFromError(err: Error): ErrorBoundaryState {
    return { hasError: true, error: err.message ?? String(err) };
  }

  recover = () => {
    queryClient.clear();
    this.setState({ hasError: false, error: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={eb.root}>
          <Text style={eb.icon}>⚠️</Text>
          <Text style={eb.title}>Something went wrong</Text>
          <Text style={eb.message} numberOfLines={4}>{this.state.error}</Text>
          <TouchableOpacity style={eb.btn} onPress={this.recover}>
            <Text style={eb.btnText}>Go back to login</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const eb = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#0A0B0D', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  icon:    { fontSize: 48 },
  title:   { color: '#F0F2F8', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  message: { color: '#555E70', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  btn:     { backgroundColor: '#3D7FFF', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32, marginTop: 8 },
  btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <StatusBar style="light" backgroundColor="#0A0B0D" />
          <RootNavigator />
        </ErrorBoundary>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
