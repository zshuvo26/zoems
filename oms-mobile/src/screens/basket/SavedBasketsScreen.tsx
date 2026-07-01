import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savedBasketApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import type { SavedBasket } from '../../types/api';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: Colors.text.muted,
  APPROVED: Colors.bull,
  SCHEDULED: '#FFB547',
  EXECUTED: Colors.accent.blue,
};

function BasketCard({ basket, onApprove, onExecute, onClone, onDelete, onSchedule }: {
  basket: SavedBasket;
  onApprove: () => void;
  onExecute: () => void;
  onClone: () => void;
  onDelete: () => void;
  onSchedule: () => void;
}) {
  const color = STATUS_COLOR[basket.status] ?? Colors.text.muted;
  return (
    <View style={styles.basketCard}>
      <View style={styles.basketHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.basketName}>{basket.basketName}</Text>
          {basket.description ? <Text style={styles.basketDesc}>{basket.description}</Text> : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
          <Text style={[styles.statusText, { color }]}>{basket.status}</Text>
        </View>
      </View>
      <View style={styles.basketMeta}>
        <Ionicons name="layers-outline" size={12} color={Colors.text.muted} />
        <Text style={styles.metaText}>{basket.orderCount} orders</Text>
        {basket.allOrNone && (
          <>
            <Text style={styles.metaDot}>·</Text>
            <Text style={[styles.metaText, { color: '#FFB547' }]}>All-or-None</Text>
          </>
        )}
        {basket.scheduledAt && (
          <>
            <Text style={styles.metaDot}>·</Text>
            <Ionicons name="time-outline" size={12} color={Colors.text.muted} />
            <Text style={styles.metaText}>{basket.scheduledAt.substring(0, 16).replace('T', ' ')}</Text>
          </>
        )}
      </View>
      <View style={styles.actions}>
        {basket.status === 'DRAFT' && (
          <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={onApprove}>
            <Ionicons name="checkmark-circle-outline" size={14} color={Colors.bull} />
            <Text style={[styles.actionText, { color: Colors.bull }]}>Approve</Text>
          </TouchableOpacity>
        )}
        {(basket.status === 'APPROVED') && (
          <TouchableOpacity style={[styles.actionBtn, styles.executeBtn]} onPress={onExecute}>
            <Ionicons name="play-circle" size={14} color="#fff" />
            <Text style={[styles.actionText, { color: '#fff' }]}>Execute</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.actionBtn} onPress={onSchedule}>
          <Ionicons name="calendar-outline" size={14} color={Colors.accent.blue} />
          <Text style={[styles.actionText, { color: Colors.accent.blue }]}>Schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onClone}>
          <Ionicons name="copy-outline" size={14} color={Colors.text.secondary} />
          <Text style={[styles.actionText, { color: Colors.text.secondary }]}>Clone</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={14} color={Colors.bear} />
          <Text style={[styles.actionText, { color: Colors.bear }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SavedBasketsScreen() {
  const nav = useNavigation<any>();
  const { accountId } = useAuthStore();
  const qc = useQueryClient();

  const { data: raw, isLoading } = useQuery({
    queryKey: ['savedBaskets', accountId],
    queryFn: () => savedBasketApi.list(accountId!),
    enabled: !!accountId,
  });
  const baskets: SavedBasket[] = (raw as any)?.data ?? raw ?? [];

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName]       = useState('');
  const [newDesc, setNewDesc]       = useState('');
  const [allOrNone, setAllOrNone]   = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['savedBaskets', accountId] });

  const saveMut = useMutation({
    mutationFn: () => savedBasketApi.save({
      accountId: accountId!, basketName: newName.trim(),
      description: newDesc.trim(), allOrNone, orders: [],
    }),
    onSuccess: () => { invalidate(); setShowCreate(false); setNewName(''); setNewDesc(''); },
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => savedBasketApi.approve(id),
    onSuccess: invalidate,
  });

  const executeMut = useMutation({
    mutationFn: (id: string) => savedBasketApi.execute(id),
    onSuccess: () => { invalidate(); Alert.alert('Basket Executed', 'All orders submitted.'); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const cloneMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => savedBasketApi.clone(id, name),
    onSuccess: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => savedBasketApi.delete(id),
    onSuccess: invalidate,
  });

  const handleClone = (basket: SavedBasket) => {
    Alert.prompt('Clone Basket', 'Enter new basket name:', (name) => {
      if (name?.trim()) cloneMut.mutate({ id: basket.id, name: name.trim() });
    }, 'plain-text', `Copy of ${basket.basketName}`);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Basket', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMut.mutate(id) },
    ]);
  };

  const handleExecute = (basket: SavedBasket) => {
    Alert.alert('Execute Basket', `Submit all ${basket.orderCount} orders in "${basket.basketName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Execute', style: 'default', onPress: () => executeMut.mutate(basket.id) },
    ]);
  };

  return (
    <View style={styles.root}>
      {isLoading ? (
        <ActivityIndicator color={Colors.accent.blue} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={baskets}
          keyExtractor={b => b.id}
          renderItem={({ item }) => (
            <BasketCard
              basket={item}
              onApprove={() => approveMut.mutate(item.id)}
              onExecute={() => handleExecute(item)}
              onClone={() => handleClone(item)}
              onDelete={() => handleDelete(item.id)}
              onSchedule={() => Alert.alert('Schedule', 'Tap to set a schedule time (UI coming soon)')}
            />
          )}
          contentContainerStyle={{ padding: Spacing.sm, gap: Spacing.sm, paddingBottom: 80 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="layers-outline" size={48} color={Colors.text.muted} />
              <Text style={styles.emptyText}>No saved baskets</Text>
              <Text style={styles.emptyHint}>Create a basket to save order sets for reuse</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal visible={showCreate} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Saved Basket</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Ionicons name="close" size={22} color={Colors.text.muted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input} placeholder="Basket Name *"
              placeholderTextColor={Colors.text.muted} value={newName} onChangeText={setNewName}
            />
            <TextInput
              style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
              placeholder="Description (optional)"
              placeholderTextColor={Colors.text.muted} value={newDesc} onChangeText={setNewDesc} multiline
            />
            <TouchableOpacity style={styles.toggleRow} onPress={() => setAllOrNone(v => !v)}>
              <View style={[styles.checkbox, allOrNone && { backgroundColor: Colors.accent.blue }]}>
                {allOrNone && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={{ color: Colors.text.secondary, fontSize: Typography.size.sm }}>All-or-None execution</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, !newName.trim() && { opacity: 0.5 }]}
              onPress={() => saveMut.mutate()}
              disabled={saveMut.isPending || !newName.trim()}
            >
              {saveMut.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Save Basket</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: Colors.bg.primary },
  basketCard:  { backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border.subtle, padding: Spacing.base, gap: Spacing.sm },
  basketHeader:{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  basketName:  { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '800' },
  basketDesc:  { color: Colors.text.muted, fontSize: Typography.size.xs, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  basketMeta:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:    { color: Colors.text.muted, fontSize: 11 },
  metaDot:     { color: Colors.text.muted, fontSize: 11 },
  actions:     { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: 4 },
  actionBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: Colors.border.default },
  approveBtn:  { borderColor: Colors.bull + '55' },
  executeBtn:  { backgroundColor: Colors.bull, borderColor: Colors.bull },
  actionText:  { fontSize: 11, fontWeight: '700' },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyText:   { color: Colors.text.muted, fontSize: Typography.size.base, fontWeight: '700' },
  emptyHint:   { color: Colors.text.muted, fontSize: Typography.size.xs, textAlign: 'center' },
  fab:         { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.accent.blue, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal:       { backgroundColor: Colors.bg.secondary, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: Spacing.sm },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle:  { color: Colors.text.primary, fontSize: Typography.size.lg, fontWeight: '800' },
  input:       { backgroundColor: Colors.bg.primary, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border.default, color: Colors.text.primary, paddingHorizontal: 12, paddingVertical: 10, fontSize: Typography.size.sm },
  toggleRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkbox:    { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: Colors.accent.blue, alignItems: 'center', justifyContent: 'center' },
  saveBtn:     { paddingVertical: 14, borderRadius: BorderRadius.md, backgroundColor: Colors.accent.blue, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.size.base },
});
