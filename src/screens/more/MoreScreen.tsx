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
};

const MENU_SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Trading Tools',
    items: [
      { label: 'Watchlist',     icon: 'bookmark',      color: '#9B8CF2', screen: 'Watchlist',   description: 'Track instruments with price alerts' },
      { label: 'Notifications', icon: 'notifications', color: '#3D7FFF', screen: 'Notifications', description: 'Order fills, price alerts, system messages' },
      { label: 'IPO',           icon: 'rocket',        color: '#00D09C', screen: 'Ipo',          description: 'Open issues and subscription' },
    ],
  },
  {
    title: 'Risk & Finance',
    items: [
      { label: 'Margin & Risk',    icon: 'shield',            color: '#FFB547', screen: 'Margin',           description: 'Margin usage, buying power, exposure' },
      { label: 'Settlement (T+2)', icon: 'calendar',          color: '#3D7FFF', screen: 'Settlement',       description: 'Pending deliveries and receives' },
      { label: 'Risk Limits',      icon: 'options',           color: '#FF6B6B', screen: 'RiskLimits',       description: 'Max order value, daily loss, margin multiplier' },
    ],
  },
  {
    title: 'Regulatory',
    items: [
      { label: 'Compliance Rules',    icon: 'document-text',  color: '#9B8CF2', screen: 'Compliance',       description: 'BSEC circuit breaker and order rules' },
      { label: 'Corporate Actions',   icon: 'gift',           color: '#00D09C', screen: 'CorporateActions', description: 'Dividends, splits, rights issues' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Settings', icon: 'settings', color: Colors.text.muted, screen: 'Settings', description: 'Server URL, preferences' },
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

      {MENU_SECTIONS.map(section => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.items.map((item, idx) => (
              <React.Fragment key={item.screen}>
                <TouchableOpacity
                  style={styles.item}
                  activeOpacity={0.7}
                  onPress={() => nav.navigate(item.screen)}
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
});
