import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Linking, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { corporateApi } from '../../api';
import { LoadingView } from '../../components/common';

// News categories
type NewsCategory = 'ALL' | 'MARKET' | 'CORPORATE' | 'REGULATORY' | 'IPO';

// Curated DSE/CSE market news feed (representative articles)
const MARKET_NEWS = [
  {
    id: '1', category: 'MARKET' as NewsCategory,
    title: 'DSEX Gains 42 Points on Banking Sector Rally',
    summary: 'The Dhaka Stock Exchange benchmark index DSEX advanced 42 points to close at 6,284, driven by strong buying in banking and pharmaceutical counters.',
    source: 'DSE Daily', time: '2h ago', symbol: null, urgent: false,
  },
  {
    id: '2', category: 'REGULATORY' as NewsCategory,
    title: 'BSEC Tightens Circuit Breaker Rules for Z-Board Stocks',
    summary: 'Bangladesh Securities and Exchange Commission has revised circuit breaker limits for Z-category stocks from ±10% to ±5% effective next month.',
    source: 'BSEC Circular', time: '4h ago', symbol: null, urgent: true,
  },
  {
    id: '3', category: 'CORPORATE' as NewsCategory,
    title: 'Grameenphone Reports Q3 Net Profit of BDT 580 Crore',
    summary: 'GP declared Q3 earnings with 8.2% YoY growth. The board proposed 100% cash dividend for the year. EPS stands at BDT 21.44.',
    source: 'GP Investor Relations', time: '6h ago', symbol: 'GP', urgent: false,
  },
  {
    id: '4', category: 'CORPORATE' as NewsCategory,
    title: 'Square Pharmaceuticals Launches New API Export Deal',
    summary: 'Square Pharma signed a USD 15M export agreement with European pharmaceutical distributor for API supply over 3 years.',
    source: 'Business Standard BD', time: '8h ago', symbol: 'SQURPHARMA', urgent: false,
  },
  {
    id: '5', category: 'MARKET' as NewsCategory,
    title: 'Foreign Investors Net Buy BDT 42 Crore in DSE',
    summary: 'Foreign portfolio investors turned net buyers with BDT 42 crore purchases concentrated in telecom and pharmaceutical sectors.',
    source: 'DSE Market Data', time: '10h ago', symbol: null, urgent: false,
  },
  {
    id: '6', category: 'IPO' as NewsCategory,
    title: 'Apex Footwear IPO Subscription Opens Next Week',
    summary: 'Apex Footwear has received BSEC approval for its IPO at BDT 50 per share. Subscription opens Monday with 8 crore shares on offer.',
    source: 'IPO Wire BD', time: '12h ago', symbol: null, urgent: false,
  },
  {
    id: '7', category: 'REGULATORY' as NewsCategory,
    title: 'DSE Extends Trading Hours by 30 Minutes from January',
    summary: 'The Dhaka Stock Exchange has announced trading hours will be extended to 15:00 BST starting January, giving investors more time for price discovery.',
    source: 'DSE Official', time: '1d ago', symbol: null, urgent: false,
  },
  {
    id: '8', category: 'CORPORATE' as NewsCategory,
    title: 'BRAC Bank Receives ADB Green Bond Framework Approval',
    summary: 'BRAC Bank has obtained ADB approval for a USD 50M green bond framework focused on SME climate finance, enhancing capital adequacy.',
    source: 'Financial Express BD', time: '1d ago', symbol: 'BRACBANK', urgent: false,
  },
  {
    id: '9', category: 'MARKET' as NewsCategory,
    title: 'CSE All Share Index Touches 3-Month High',
    summary: 'The Chittagong Stock Exchange All Share Price Index (CASPI) reached its highest level in three months at 18,420 on robust cement sector activity.',
    source: 'CSE Daily', time: '1d ago', symbol: null, urgent: false,
  },
  {
    id: '10', category: 'CORPORATE' as NewsCategory,
    title: 'Walton Hi-Tech Announces 200% Bonus Share',
    summary: 'Walton Hi-Tech Industries declared a 200% bonus share issue from retained earnings, record date set for next month.',
    source: 'DSE Announcement', time: '2d ago', symbol: 'WALTONHIL', urgent: false,
  },
  {
    id: '11', category: 'REGULATORY' as NewsCategory,
    title: 'BSEC Introduces Stricter Insider Trading Surveillance',
    summary: 'New surveillance software deployed by BSEC will monitor unusual pre-announcement trading patterns and generate automated alerts to enforcement.',
    source: 'BSEC Press Release', time: '2d ago', symbol: null, urgent: false,
  },
  {
    id: '12', category: 'MARKET' as NewsCategory,
    title: 'T+2 Settlement Successfully Processed for Record 45 Crore Shares',
    summary: 'CDBL processed record 45 crore shares in T+2 settlement cycle, indicating growing market depth and investor confidence.',
    source: 'CDBL Report', time: '3d ago', symbol: null, urgent: false,
  },
];

const CATEGORY_ICONS: Record<NewsCategory, keyof typeof import('@expo/vector-icons').Ionicons.glyphMap> = {
  ALL: 'newspaper-outline',
  MARKET: 'trending-up-outline',
  CORPORATE: 'business-outline',
  REGULATORY: 'shield-checkmark-outline',
  IPO: 'rocket-outline',
};

const CATEGORY_COLORS: Record<NewsCategory, string> = {
  ALL: Colors.accent.blue,
  MARKET: '#00D09C',
  CORPORATE: '#9B8CF2',
  REGULATORY: '#FFB547',
  IPO: '#3D7FFF',
};

export default function NewsScreen() {
  const [category, setCategory] = useState<NewsCategory>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const { data: corpActions } = useQuery({
    queryKey: ['corpActions'],
    queryFn: () => corporateApi.upcoming(7),
  });

  const filtered = useMemo(() =>
    category === 'ALL' ? MARKET_NEWS : MARKET_NEWS.filter(n => n.category === category),
    [category],
  );

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <View style={styles.root}>
      {/* Category filter */}
      <View style={styles.filterBar}>
        {(['ALL', 'MARKET', 'CORPORATE', 'REGULATORY', 'IPO'] as NewsCategory[]).map(cat => {
          const active = category === cat;
          const color  = CATEGORY_COLORS[cat];
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.catBtn, active && { backgroundColor: color + '22', borderColor: color }]}
              onPress={() => setCategory(cat)}
            >
              <Ionicons
                name={CATEGORY_ICONS[cat]}
                size={12}
                color={active ? color : Colors.text.muted}
              />
              <Text style={[styles.catText, active && { color }]}>{cat === 'ALL' ? 'All' : cat}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={n => n.id}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent.blue} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          corpActions && corpActions.length > 0 ? (
            <View style={styles.corpActBanner}>
              <Ionicons name="calendar-outline" size={14} color={Colors.status.warning} />
              <Text style={styles.corpActText}>
                {corpActions.length} corporate action{corpActions.length > 1 ? 's' : ''} in next 7 days:
                {' '}{corpActions.slice(0, 3).map(a => a.symbol).join(', ')}
                {corpActions.length > 3 ? ' +more' : ''}
              </Text>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item: n }) => {
          const color = CATEGORY_COLORS[n.category];
          return (
            <TouchableOpacity style={styles.card} activeOpacity={0.75}>
              <View style={styles.cardHeader}>
                <View style={[styles.catTag, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.catTagText, { color }]}>{n.category}</Text>
                </View>
                {n.urgent && (
                  <View style={styles.urgentTag}>
                    <Text style={styles.urgentText}>URGENT</Text>
                  </View>
                )}
                {n.symbol && (
                  <View style={styles.symbolTag}>
                    <Text style={styles.symbolTagText}>{n.symbol}</Text>
                  </View>
                )}
                <Text style={styles.timeText}>{n.time}</Text>
              </View>
              <Text style={styles.title}>{n.title}</Text>
              <Text style={styles.summary} numberOfLines={2}>{n.summary}</Text>
              <View style={styles.cardFooter}>
                <Ionicons name="newspaper-outline" size={12} color={Colors.text.muted} />
                <Text style={styles.source}>{n.source}</Text>
                <TouchableOpacity style={styles.readMore}>
                  <Text style={styles.readMoreText}>Read more</Text>
                  <Ionicons name="chevron-forward" size={11} color={Colors.accent.blue} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },

  filterBar: {
    flexDirection: 'row', gap: 4, padding: Spacing.sm,
    backgroundColor: Colors.bg.secondary,
    borderBottomWidth: 1, borderBottomColor: Colors.border.subtle,
    flexWrap: 'wrap',
  },
  catBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 5,
    borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border.default,
    backgroundColor: Colors.bg.secondary,
  },
  catText: { color: Colors.text.muted, fontSize: 11, fontWeight: '600' },

  corpActBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.status.warning + '15',
    borderLeftWidth: 3, borderLeftColor: Colors.status.warning,
    padding: Spacing.sm, margin: Spacing.sm, borderRadius: BorderRadius.sm,
  },
  corpActText: { color: Colors.text.secondary, fontSize: 12, flex: 1 },

  sep:  { height: 1, backgroundColor: Colors.border.subtle, marginHorizontal: Spacing.base },

  card: {
    backgroundColor: Colors.bg.secondary,
    margin: Spacing.sm, marginBottom: 0,
    borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border.subtle,
    padding: Spacing.base, gap: Spacing.xs,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },

  catTag:     { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  catTagText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  urgentTag:  { backgroundColor: Colors.bear + '22', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  urgentText: { color: Colors.bear, fontSize: 9, fontWeight: '800' },

  symbolTag:     { backgroundColor: Colors.accent.blue + '22', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  symbolTagText: { color: Colors.accent.blue, fontSize: 9, fontWeight: '800' },

  timeText: { color: Colors.text.muted, fontSize: 10, marginLeft: 'auto' as any },

  title:   { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700', lineHeight: 20 },
  summary: { color: Colors.text.secondary, fontSize: Typography.size.xs, lineHeight: 18 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  source:     { color: Colors.text.muted, fontSize: 11, flex: 1 },
  readMore:   { flexDirection: 'row', alignItems: 'center', gap: 2 },
  readMoreText:{ color: Colors.accent.blue, fontSize: 11, fontWeight: '600' },
});
