import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './navigation';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:    30_000,
      gcTime:       5 * 60_000,
      retry:        2,
      retryDelay:   (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    },
    mutations: {
      retry: false,
    },
  },
});

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" backgroundColor="#0A0B0D" />
        <RootNavigator />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
