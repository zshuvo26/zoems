import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { corporateApi } from '../../api';
import { LoadingView, ErrorView, Badge } from '../../components/common';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatDate } from '../../utils/formatters';
import type { CorporateAction } from '../../types/api';

const TYPE_META: Record<CorporateAction['type'], { icon: string; color: string; label: string }> = {
  CASH_DIVIDEND:  { icon: 'cash-outline',         color: Colors.bull,            label: 'Cash Dividend' },
  BONUS_SHARE:    { icon: 'gift-outline',          color: Colors.accent.blue,     label: 'Bonus Share' },
  STOCK_SPLIT:    { icon: 'git-branch-outline',    color: Colors.status.warning,  label: 'Stock Split' },
  REVERSE_SPLIT:  { icon: 'git-merge-outline',     color: Colors.bear,            label: 'Reverse Split' },
  RIGHTS_ISSUE:   { icon: 'ticket-outline',        color: Colors.accent.purple,   label: 'Rights Issue' },
};

type FilterType = 'ALL' | CorporateAction['type'];

export default function CorporateActionsScreen() {
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [upcoming, setUpcoming] = useState(true);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['corporate', upcoming],
    queryFn:  () => upcoming ? corporateApi.upcoming(60) : corporateApi.all(),
  });

  const items = (data ?? []).filter(item =>
    filter === 'ALL' || item.type === filter
  );

  if (isLoading) return <LoadingView message="Loading corporate actions…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  return (
    <View style={styles.root}>
      {/* Toggle upcoming / all */}
      <View style={styles.toggleRow}>
        <TouchableOpacity style={[styles.toggle, upcoming && styles.toggleActive]} onPress={() => setUpcoming(true)}>
          <Text style={[styles.toggleText, upcoming && styles.toggleTextActive]}>Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggle, !upcoming && styles.toggleActive]} onPress={() => setUpcoming(false)}>
          <Text style={[styles.toggleText, !upcoming && styles.toggleTextActive]}>All</Text>
        </TouchableOpacity>
      </View>

      {/* Type filter */}
      <View style={styles.filterRow}>
        <TypeChip type="ALL"           active={filter === 'ALL'}           onPress={() => setFilter('ALL')} />
        <TypeChip type="CASH_DIVIDEND" active={filter === 'CASH_DIVIDEND'} onPress={() => setFilter('CASH_DIVIDEND')} />
        <TypeChip type="BONUS_SHARE"   active={filter === 'BONUS_SHARE'}   onPress={() => setFilter('BONUS_SHARE')} />
        <TypeChip type="STOCK_SPLIT"   active={filter === 'STOCK_SPLIT'}   onPress={() => setFilter('STOCK_SPLIT')} />
        <TypeChip type="RIGHTS_ISSUE"  active={filter === 'RIGHTS_ISSUE'}  onPress={() => setFilter('RIGHTS_ISSUE')} />
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={48} color={Colors.text.muted} />
          <Text style={styles.emptyText}>No corporate actions found</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          renderItem={({ item }) => <ActionCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function TypeChip({ type, active, onPress }: { type: FilterType; active: boolean; onPress: () => void }) {
  const meta = type === 'ALL' ? { label: 'All', color: Colors.accent.blue } : { label: TYPE_META[type].label, color: TYPE_META[type].color };
  return (
    <TouchableOpacity
      style={[styles.chip, active && { borderColor: meta.color, backgroundColor: meta.color + '22' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, active && { color: meta.color }]}>{meta.label}</Text>
    </TouchableOpacity>
  );
}

function ActionCard({ item }: { item: CorporateAction }) {
  const meta = TYPE_META[item.type];
  const daysToEx = Math.ceil((new Date(item.exDate).getTime() - Date.now()) / 86_400_000);
  const isUpcoming = daysToEx > 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: meta.color + '22' }]}>
          <Ionicons name={meta.icon as any} size={20} color={meta.color} />
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.cardTopRow}>
            <Text style={styles.symbol}>{item.symbol}</Text>
            <Badge label={item.exchange} />
          </View>
          <Text style={styles.typeName}>{meta.label}</Text>
        </View>
        <View style={[styles.ratioBadge, { backgroundColor: meta.color + '22' }]}>
          <Text style={[styles.ratioText, { color: meta.color }]}>
            {item.type === 'CASH_DIVIDEND' ? `৳${item.ratio}` : `${item.ratio}:1`}
          </Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

      <View style={styles.datesRow}>
        <DateItem label="Announced" value={formatDate(item.announcementDate)} />
        <DateItem label="Ex-Date" value={formatDate(item.exDate)} highlight={isUpcoming} />
        {item.paymentDate ? <DateItem label="Payment" value={formatDate(item.paymentDate)} /> : null}
      </View>

      {isUpcoming && (
        <View style={[styles.exDateBanner, { backgroundColor: meta.color + '11', borderColor: meta.color + '33' }]}>
          <Ionicons name="time-outline" size={12} color={meta.color} />
          <Text style={[styles.exDateBannerText, { color: meta.color }]}>
            Ex-date in {daysToEx} day{daysToEx !== 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

function DateItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.dateItem}>
      <Text style={styles.dateLabel}>{label}</Text>
      <Text style={[styles.dateValue, highlight && { color: Colors.status.warning }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },

  toggleRow: {
    flexDirection: 'row', margin: Spacing.base, marginBottom: Spacing.sm,
    backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border.subtle, padding: 3,
  },
  toggle:           { flex: 1, paddingVertical: Spacing.xs, alignItems: 'center', borderRadius: BorderRadius.sm - 2 },
  toggleActive:     { backgroundColor: Colors.accent.blue },
  toggleText:       { color: Colors.text.muted, fontSize: Typography.size.sm, fontWeight: '600' },
  toggleTextActive: { color: Colors.white },

  filterRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs,
    paddingHorizontal: Spacing.base, marginBottom: Spacing.sm,
  },
  chip: {
    borderWidth: 1, borderColor: Colors.border.default, borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 4, backgroundColor: Colors.bg.secondary,
  },
  chipText: { color: Colors.text.muted, fontSize: 11, fontWeight: '600' },

  list:  { padding: Spacing.base, gap: Spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  emptyText: { color: Colors.text.muted, fontSize: Typography.size.base },

  card: {
    backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border.subtle,
    padding: Spacing.base, gap: Spacing.sm,
  },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconBox:     { width: 40, height: 40, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  cardMeta:    { flex: 1, gap: 2 },
  cardTopRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  symbol:      { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '800' },
  typeName:    { color: Colors.text.muted, fontSize: Typography.size.xs },
  ratioBadge:  { borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  ratioText:   { fontSize: Typography.size.sm, fontWeight: '800' },
  description: { color: Colors.text.secondary, fontSize: Typography.size.xs, lineHeight: 18 },

  datesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateItem:  {},
  dateLabel: { color: Colors.text.muted, fontSize: 10 },
  dateValue: { color: Colors.text.primary, fontSize: Typography.size.xs, fontWeight: '600', marginTop: 2 },

  exDateBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: BorderRadius.sm, padding: Spacing.xs,
  },
  exDateBannerText: { fontSize: Typography.size.xs, fontWeight: '600' },
});
