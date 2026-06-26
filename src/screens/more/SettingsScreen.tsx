import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Storage } from '../../utils/storage';
import { useAuthStore } from '../../store/auth';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';

const PRESET_SERVERS = [
  { label: 'OMS Server',  url: 'http://192.168.0.103:9091' },
  { label: 'Localhost',   url: 'http://10.0.2.2:9091' },
  { label: 'DSE Prod',    url: 'https://oms.dse.com.bd' },
];

export default function SettingsScreen() {
  const { logout, role, username } = useAuthStore();

  const [baseUrl,    setBaseUrl]    = useState('');
  const [savedUrl,   setSavedUrl]   = useState('');
  const [saved,      setSaved]      = useState(false);
  const [claudeKey,  setClaudeKey]  = useState('');
  const [savedKey,   setSavedKey]   = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    Storage.getBaseUrl().then(url => {
      const v = url ?? 'http://192.168.0.103:9091';
      setBaseUrl(v);
      setSavedUrl(v);
    });
    Storage.getClaudeApiKey().then(k => setClaudeKey(k ?? ''));
  }, []);

  const saveUrl = async () => {
    const trimmed = baseUrl.trim();
    if (!trimmed.startsWith('http')) {
      Alert.alert('Invalid URL', 'URL must start with http:// or https://');
      return;
    }
    await Storage.setBaseUrl(trimmed);
    setSavedUrl(trimmed);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveClaudeKey = async () => {
    await Storage.setClaudeApiKey(claudeKey.trim());
    setSavedKey(true);
    setTimeout(() => setSavedKey(false), 2000);
  };

  const confirmLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ],
    );
  };

  const isDirty = baseUrl.trim() !== savedUrl;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      {/* Server Config */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>OMS SERVER</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Base URL</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={baseUrl}
              onChangeText={setBaseUrl}
              placeholder="http://192.168.x.x:9091"
              placeholderTextColor={Colors.text.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>
          {isDirty && (
            <Text style={styles.dirtyNote}>Unsaved changes — tap Save to apply</Text>
          )}

          <Text style={styles.presetLabel}>Quick Select</Text>
          <View style={styles.presets}>
            {PRESET_SERVERS.map(p => (
              <TouchableOpacity
                key={p.url}
                style={[styles.presetBtn, baseUrl === p.url && styles.presetBtnActive]}
                onPress={() => setBaseUrl(p.url)}
              >
                <Text style={[styles.presetText, baseUrl === p.url && styles.presetTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.saveBtn, saved && styles.saveBtnSuccess]} onPress={saveUrl}>
            <Ionicons name={saved ? 'checkmark-circle' : 'save'} size={16} color={Colors.white} />
            <Text style={styles.saveBtnText}>{saved ? 'Saved!' : 'Save Server URL'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* AI Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI CONFIGURATION</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Claude API Key</Text>
          <Text style={styles.aiNote}>
            Required for AI Chat Assistant. Get your key at console.anthropic.com
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={claudeKey}
              onChangeText={setClaudeKey}
              placeholder="sk-ant-api03-..."
              placeholderTextColor={Colors.text.muted}
              secureTextEntry={!showApiKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowApiKey(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showApiKey ? 'eye-off' : 'eye'} size={18} color={Colors.text.muted} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.saveBtn, savedKey && styles.saveBtnSuccess]} onPress={saveClaudeKey}>
            <Ionicons name={savedKey ? 'checkmark-circle' : 'save'} size={16} color={Colors.white} />
            <Text style={styles.saveBtnText}>{savedKey ? 'Saved!' : 'Save API Key'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Session */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SESSION</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Username</Text>
            <Text style={styles.infoValue}>{username ?? '—'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue}>{role ?? '—'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Connected To</Text>
            <Text style={[styles.infoValue, styles.monospace]} numberOfLines={1}>{savedUrl}</Text>
          </View>
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>FIX Protocol</Text>
            <Text style={styles.infoValue}>FIX 4.4 / QuickFIX/J</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Market</Text>
            <Text style={styles.infoValue}>DSE / CSE (Bangladesh)</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Settlement</Text>
            <Text style={styles.infoValue}>T+2 (BST Sun–Thu 10:00–14:30)</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
        <Ionicons name="log-out-outline" size={18} color={Colors.bear} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing.base, gap: Spacing.base, paddingBottom: 40 },

  section:      { gap: Spacing.xs },
  sectionTitle: { color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '700', letterSpacing: 1, paddingHorizontal: Spacing.xs },

  card: {
    backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.lg, borderWidth: 1,
    borderColor: Colors.border.subtle, padding: Spacing.base, gap: Spacing.sm,
  },

  label:    { color: Colors.text.secondary, fontSize: Typography.size.sm, fontWeight: '600' },
  aiNote:   { color: Colors.text.muted, fontSize: Typography.size.xs, lineHeight: 16 },
  inputRow: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: Colors.bg.tertiary, borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    color: Colors.text.primary, fontSize: Typography.size.sm, fontFamily: 'monospace',
  },
  eyeBtn:   { padding: Spacing.sm },
  dirtyNote:{ color: Colors.status.warning, fontSize: Typography.size.xs },

  presetLabel: { color: Colors.text.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  presets:     { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  presetBtn:       { borderWidth: 1, borderColor: Colors.border.default, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, backgroundColor: Colors.bg.tertiary },
  presetBtnActive: { borderColor: Colors.accent.blue, backgroundColor: Colors.accent.blue + '22' },
  presetText:      { color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '600' },
  presetTextActive:{ color: Colors.accent.blue },

  saveBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, backgroundColor: Colors.accent.blue, borderRadius: BorderRadius.md, paddingVertical: Spacing.sm },
  saveBtnSuccess: { backgroundColor: Colors.bull },
  saveBtnText:    { color: Colors.white, fontSize: Typography.size.sm, fontWeight: '800' },

  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { color: Colors.text.muted, fontSize: Typography.size.sm, flex: 1 },
  infoValue: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '600', flex: 2, textAlign: 'right' },
  monospace: { fontFamily: 'monospace', fontSize: 10 },
  divider:   { height: 1, backgroundColor: Colors.border.subtle },

  logoutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.base, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.bear + '44' },
  logoutText: { color: Colors.bear, fontSize: Typography.size.base, fontWeight: '700' },
});
