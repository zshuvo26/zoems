import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { notificationsApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { LoadingView, ErrorView } from '../../components/common';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { timeAgo } from '../../utils/formatters';
import type { Notification } from '../../types/api';

const NOTIF_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  ORDER_FILLED:   'checkmark-circle',
  ORDER_REJECTED: 'close-circle',
  ORDER_PARTIAL:  'ellipse-outline',
  PRICE_ALERT:    'notifications',
  RISK_ALERT:     'warning',
  SYSTEM:         'information-circle',
};

const NOTIF_COLOR: Record<string, string> = {
  ORDER_FILLED:   '#00D09C',
  ORDER_REJECTED: '#FF4B4B',
  ORDER_PARTIAL:  '#FFB547',
  PRICE_ALERT:    '#9B8CF2',
  RISK_ALERT:     '#FF4B4B',
  SYSTEM:         '#3D7FFF',
};

export default function NotificationsScreen() {
  const { accountId } = useAuthStore();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey:        ['notifications', accountId],
    queryFn:         () => accountId ? notificationsApi.all(accountId) : [],
    enabled:         !!accountId,
    refetchInterval: 20_000,
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifCount'] });
    },
  });

  const markAllMut = useMutation({
    mutationFn: () => notificationsApi.markAllRead(accountId!),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifCount'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  if (isLoading) return <LoadingView message="Loading notifications…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  const items  = (data ?? []) as Notification[];
  const unread = items.filter(n => !n.isRead).length;

  return (
    <View style={styles.root}>
      {unread > 0 && (
        <TouchableOpacity style={styles.markAllBar} onPress={() => markAllMut.mutate()}>
          <Text style={styles.markAllText}>Mark all {unread} as read</Text>
          <Ionicons name="checkmark-done" size={16} color={Colors.accent.blue} />
        </TouchableOpacity>
      )}

      <FlatList
        data={items}
        keyExtractor={n => n.id}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.accent.blue} />}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : { paddingVertical: Spacing.sm }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={Colors.text.muted} />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySub}>You're all caught up</Text>
          </View>
        }
        renderItem={({ item: n }) => {
          const icon  = NOTIF_ICON[n.type] ?? 'information-circle';
          const color = NOTIF_COLOR[n.type] ?? Colors.accent.blue;
          return (
            <TouchableOpacity
              style={[styles.row, !n.isRead && styles.rowUnread]}
              activeOpacity={0.7}
              onPress={() => !n.isRead && markReadMut.mutate(n.id)}
            >
              <View style={[styles.iconWrap, { backgroundColor: color + '22' }]}>
                <Ionicons name={icon} size={20} color={color} />
              </View>
              <View style={styles.content}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, !n.isRead && styles.titleUnread]}>{n.title}</Text>
                  {!n.isRead && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.message} numberOfLines={2}>{n.message}</Text>
                <Text style={styles.time}>{timeAgo(n.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: Colors.bg.primary },
  emptyContainer: { flex: 1 },
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingTop: 80 },
  emptyTitle:     { color: Colors.text.secondary, fontSize: Typography.size.base, fontWeight: '700' },
  emptySub:       { color: Colors.text.muted, fontSize: Typography.size.sm },

  markAllBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.xs,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    backgroundColor: Colors.bg.secondary, borderBottomWidth: 1, borderBottomColor: Colors.border.default,
  },
  markAllText: { color: Colors.accent.blue, fontSize: Typography.size.sm, fontWeight: '600' },

  row: {
    flexDirection: 'row', gap: Spacing.base, paddingHorizontal: Spacing.base, paddingVertical: Spacing.base,
    backgroundColor: Colors.bg.primary,
  },
  rowUnread: { backgroundColor: Colors.bg.secondary },
  separator: { height: 1, backgroundColor: Colors.border.subtle },

  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  content:  { flex: 1, gap: 3 },

  titleRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  title:       { color: Colors.text.secondary, fontSize: Typography.size.sm, fontWeight: '600', flex: 1 },
  titleUnread: { color: Colors.text.primary, fontWeight: '800' },
  unreadDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.accent.blue },
  message:     { color: Colors.text.muted, fontSize: Typography.size.xs, lineHeight: 16 },
  time:        { color: Colors.text.muted, fontSize: 10 },
});
