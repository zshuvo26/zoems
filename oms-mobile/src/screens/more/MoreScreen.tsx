import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/auth';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';

type MenuItem = {
  label:       string;
  icon:        keyof typeof Ionicons.glyphMap;
  color:       string;
  screen:      string;
  description: string;
  isMarket?:   boolean;
};

const MENU_SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Trading Tools',
    items: [
      { label: 'Watchlist',        icon: 'bookmark',       color: '#9B8CF2', screen: 'Watchlist',       description: 'Track instruments with named lists' },
      { label: 'Price Alerts',     icon: 'notifications',  color: '#FFB547', screen: 'PriceAlerts',     description: 'Set price targets — get notified instantly' },
      { label: 'Order Templates',  icon: 'document-text',  color: '#3D7FFF', screen: 'OrderTemplates',  description: 'Save & reuse order configurations' },
      { label: 'Trade History',    icon: 'receipt',        color: '#00D09C', screen: 'TradeHistory',    description: 'Full order history with CSV export' },
      { label: 'IPO',              icon: 'rocket',         color: '#9B8CF2', screen: 'Ipo',             description: 'Open issues and subscription' },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { label: 'Profit Calculator',icon: 'calculator',     color: '#00D09C', screen: 'ProfitCalculator',description: 'P&L, break-even, scenario analysis with BD fees' },
      { label: 'Market News',      icon: 'newspaper',      color: '#3D7FFF', screen: 'News',            description: 'DSE/CSE market news and announcements' },
      { label: 'Foreign Flow (FDR)',icon: 'globe',          color: '#3D7FFF', screen: 'ForeignFlow',     description: 'Foreign investor buy/sell tracking', isMarket: true },
      { label: 'Circuit Breaker',  icon: 'warning',        color: '#FF6B6B', screen: 'CircuitBreaker',  description: 'Instruments near ±10% daily limit', isMarket: true },
      { label: 'Sector Heatmap',   icon: 'grid',           color: '#00A86B', screen: 'SectorHeatmap',   description: 'Sector performance overview', isMarket: true },
      { label: 'Corporate Actions',icon: 'gift',           color: '#00D09C', screen: 'CorporateActions', description: 'Dividends, splits, rights issues' },
    ],
  },
  {
    title: 'Finance & Risk',
    items: [
      { label: 'Cash Ledger',      icon: 'wallet',         color: '#00D09C', screen: 'CashLedger',      description: 'Cash balance, fund ledger & transaction history' },
      { label: 'Margin & Risk',    icon: 'shield',         color: '#FFB547', screen: 'Margin',          description: 'Margin usage, buying power, exposure' },
      { label: 'Settlement (T+2)', icon: 'calendar',       color: '#3D7FFF', screen: 'Settlement',      description: 'Pending deliveries and receives' },
      { label: 'Risk Limits',      icon: 'options',        color: '#FF6B6B', screen: 'RiskLimits',      description: 'Max order value, daily loss, margin multiplier' },
    ],
  },
  {
    title: 'Regulatory',
    items: [
      { label: 'Compliance Rules', icon: 'document-text',  color: '#9B8CF2', screen: 'Compliance',      description: 'BSEC circuit breaker and order rules' },
      { label: 'Notifications',    icon: 'mail',           color: '#FFB547', screen: 'Notifications',   description: 'Order fills, system messages, alerts' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Settings', icon: 'settings', color: Colors.text.muted, screen: 'Settings', description: 'Server URL, theme, PIN lock' },
    ],
  },
];

export default function MoreScreen() {
  const nav = useNavigation<any>();
  const { role, username, logout } = useAuthStore();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      {/* Profile strip */}
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(username ?? 'U')[0].toUpperCase()}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.username}>{username ?? '—'}</Text>
          <Text style={styles.role}>{role ?? '—'}</Text>
        </View>
      </View>

      {/* AI Intelligence Hub */}
      <View style={styles.aiHub}>
        <View style={styles.aiHubHeader}>
          <View style={styles.aiHubIcon}>
            <Ionicons name="sparkles" size={20} color="#9B8CF2" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiHubTitle}>AI Intelligence Hub</Text>
            <Text style={styles.aiHubSub}>Powered by Claude AI — DSE/CSE specialist</Text>
          </View>
        </View>
        <View style={styles.aiHubButtons}>
          <TouchableOpacity style={styles.aiBtn} onPress={() => nav.navigate('AIInsights')} activeOpacity={0.75}>
            <Ionicons name="analytics" size={16} color="#3D7FFF" />
            <Text style={styles.aiBtnText}>Market Signals</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.aiBtn} onPress={() => nav.navigate('AIPortfolioAdvisor')} activeOpacity={0.75}>
            <Ionicons name="pie-chart" size={16} color="#00D09C" />
            <Text style={styles.aiBtnText}>Portfolio Advisor</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.aiBtn} onPress={() => nav.navigate('AIChat')} activeOpacity={0.75}>
            <Ionicons name="chatbubble-ellipses" size={16} color="#9B8CF2" />
            <Text style={styles.aiBtnText}>AI Assistant</Text>
          </TouchableOpacity>
        </View>
      </View>

      {MENU_SECTIONS.map(section => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.items.map((item, idx) => (
              <React.Fragment key={item.screen}>
                <TouchableOpacity
                  style={styles.item}
                  activeOpacity={0.7}
                  onPress={() => item.isMarket
                    ? nav.navigate('Market', { screen: item.screen })
                    : nav.navigate(item.screen)
                  }
                >
                  <View style={[styles.itemIcon, { backgroundColor: item.color + '22' }]}>
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <View style={styles.itemText}>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    <Text style={styles.itemDesc}>{item.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.text.muted} />
                </TouchableOpacity>
                {idx < section.items.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={18} color={Colors.bear} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>FIX OMS Mobile · Bangladesh DSE/CSE · v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing.base, paddingBottom: 40, gap: Spacing.base },

  profile: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.base,
    backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.lg,
    padding: Spacing.base, borderWidth: 1, borderColor: Colors.border.subtle,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.accent.blue + '33',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.accent.blue,
  },
  avatarText:  { color: Colors.accent.blue, fontSize: Typography.size.xl, fontWeight: '800' },
  profileInfo: { flex: 1 },
  username:    { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '800' },
  role:        { color: Colors.text.muted, fontSize: Typography.size.sm, marginTop: 2 },

  section:      { gap: Spacing.xs },
  sectionTitle: { color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '700', letterSpacing: 1, paddingHorizontal: Spacing.xs },
  sectionCard:  { backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border.subtle, overflow: 'hidden' },

  item:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.base, padding: Spacing.base },
  itemIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemText:  { flex: 1 },
  itemLabel: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700' },
  itemDesc:  { color: Colors.text.muted, fontSize: 11, marginTop: 2 },
  divider:   { height: 1, backgroundColor: Colors.border.subtle, marginLeft: Spacing.base + 36 + Spacing.base },

  logoutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.base, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.bear + '44' },
  logoutText: { color: Colors.bear, fontSize: Typography.size.base, fontWeight: '700' },

  version: { color: Colors.text.muted, fontSize: 10, textAlign: 'center' },

  // AI Hub
  aiHub: {
    backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: '#9B8CF2' + '44', padding: Spacing.base, gap: Spacing.sm,
  },
  aiHubHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  aiHubIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#9B8CF2' + '22', alignItems: 'center', justifyContent: 'center',
  },
  aiHubTitle: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '800' },
  aiHubSub:   { color: Colors.text.muted, fontSize: 11, marginTop: 2 },
  aiHubButtons: { flexDirection: 'row', gap: Spacing.xs },
  aiBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, backgroundColor: Colors.bg.tertiary,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border.default,
    paddingVertical: Spacing.sm,
  },
  aiBtnText: { color: Colors.text.secondary, fontSize: 10, fontWeight: '700' },
});
