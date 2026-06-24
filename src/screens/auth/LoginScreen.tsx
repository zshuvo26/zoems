import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { useAuthStore } from '../../store/auth';
import { Storage } from '../../utils/storage';

const schema = z.object({
  serverUrl: z.string().url('Invalid URL').min(1),
  username:  z.string().min(1, 'Required'),
  password:  z.string().min(1, 'Required'),
});
type Form = z.infer<typeof schema>;

const DEMO_USERS = [
  { label: 'Admin',  user: 'admin',  pass: 'admin123' },
  { label: 'Dealer', user: 'dealer', pass: 'dealer123' },
  { label: 'Trader', user: 'trader', pass: 'trader123' },
  { label: 'Viewer', user: 'viewer', pass: 'viewer123' },
];

export default function LoginScreen() {
  const { login } = useAuthStore();
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { serverUrl: 'http://192.168.1.100:9091', username: '', password: '' },
  });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      await Storage.setBaseUrl(data.serverUrl);
      await login(data.username, data.password);
    } catch (e: any) {
      Alert.alert('Login Failed', e.message ?? 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>OMS</Text>
          </View>
          <Text style={styles.title}>Bangladesh OMS</Text>
          <Text style={styles.sub}>DSE · CSE Professional Trading</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Field label="Server URL" error={errors.serverUrl?.message}>
            <Controller
              control={control}
              name="serverUrl"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  placeholder="http://192.168.1.100:9091"
                  placeholderTextColor={Colors.text.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              )}
            />
          </Field>

          <Field label="Username" error={errors.username?.message}>
            <Controller
              control={control}
              name="username"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  placeholder="Enter username"
                  placeholderTextColor={Colors.text.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              )}
            />
          </Field>

          <Field label="Password" error={errors.password?.message}>
            <View style={styles.passwordRow}>
              <Controller
                control={control}
                name="password"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Enter password"
                    placeholderTextColor={Colors.text.muted}
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                  />
                )}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPass ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.text.muted}
                />
              </TouchableOpacity>
            </View>
          </Field>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.loginBtnText}>{loading ? 'Signing In…' : 'Sign In'}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick login */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Quick Login</Text>
          <View style={styles.demoGrid}>
            {DEMO_USERS.map(u => (
              <TouchableOpacity
                key={u.user}
                style={styles.demoBtn}
                onPress={() => {
                  setValue('username', u.user);
                  setValue('password', u.pass);
                }}
              >
                <Text style={styles.demoBtnLabel}>{u.label}</Text>
                <Text style={styles.demoBtnUser}>{u.user}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>v2.0.0 · Bangladesh DSE/CSE · FIX 4.4</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { flexGrow: 1, padding: Spacing.xl, justifyContent: 'center' },

  header: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  logoBox: {
    width: 72, height: 72,
    backgroundColor: Colors.accent.blue,
    borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  logoText: { color: Colors.white, fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  title:    { color: Colors.text.primary, fontSize: Typography.size.xl, fontWeight: '700' },
  sub:      { color: Colors.text.secondary, fontSize: Typography.size.sm, marginTop: 4 },

  form: {
    backgroundColor: Colors.bg.secondary,
    borderRadius:    BorderRadius.xl,
    borderWidth:     1,
    borderColor:     Colors.border.subtle,
    padding:         Spacing.xl,
    gap:             Spacing.md,
    marginBottom:    Spacing.xl,
  },

  field:        { gap: 6 },
  fieldLabel:   { color: Colors.text.secondary, fontSize: Typography.size.sm, fontWeight: '600' },
  fieldError:   { color: Colors.bear, fontSize: Typography.size.xs },

  input: {
    backgroundColor: Colors.bg.tertiary,
    borderWidth:     1,
    borderColor:     Colors.border.default,
    borderRadius:    BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical:   Spacing.md,
    color:           Colors.text.primary,
    fontSize:        Typography.size.base,
  },
  passwordRow:   { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1 },
  eyeBtn:        { padding: Spacing.md, marginLeft: -40, zIndex: 1 },

  loginBtn: {
    backgroundColor: Colors.accent.blue,
    borderRadius:    BorderRadius.md,
    paddingVertical: Spacing.base,
    alignItems:      'center',
    marginTop:       Spacing.sm,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText:     { color: Colors.white, fontSize: Typography.size.base, fontWeight: '700' },

  demoSection:  { marginBottom: Spacing.xl },
  demoTitle:    { color: Colors.text.muted, fontSize: Typography.size.xs, textAlign: 'center', marginBottom: Spacing.sm, letterSpacing: 1 },
  demoGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  demoBtn:      {
    backgroundColor: Colors.bg.secondary,
    borderWidth:     1,
    borderColor:     Colors.border.default,
    borderRadius:    BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical:   Spacing.sm,
    alignItems:      'center',
    minWidth:        80,
  },
  demoBtnLabel: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '600' },
  demoBtnUser:  { color: Colors.text.muted, fontSize: Typography.size.xs },

  footer: { textAlign: 'center', color: Colors.text.muted, fontSize: Typography.size.xs },
});
