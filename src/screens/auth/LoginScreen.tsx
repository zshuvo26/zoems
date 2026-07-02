import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { useAuthStore } from '../../store/auth';
import { Storage } from '../../utils/storage';
import { haptic } from '../../utils/haptics';

const BIOMETRIC_CREDS_KEY = 'oms_biometric_creds';
const BIOMETRIC_ENABLED_KEY = 'oms_biometric_enabled';

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
  const [showPass,        setShowPass]        = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [biometricAvail,  setBiometricAvail]  = useState(false);
  const [biometricEnabled,setBiometricEnabled] = useState(false);
  const [bioType,         setBioType]         = useState('Biometric');

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { serverUrl: 'http://192.168.0.107:9091', username: '', password: '' },
  });

  useEffect(() => {
    (async () => {
      // Load saved server URL
      const savedUrl = await Storage.getBaseUrl();
      setValue('serverUrl', savedUrl);

      // Check biometric hardware
      const hasHw     = await LocalAuthentication.hasHardwareAsync();
      const enrolled  = await LocalAuthentication.isEnrolledAsync();
      const types     = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const enabled   = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);

      if (hasHw && enrolled) {
        setBiometricAvail(true);
        setBiometricEnabled(enabled === 'true');
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBioType('Face ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBioType('Fingerprint');
        }
      }
    })();
  }, []);

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      await Storage.setBaseUrl(data.serverUrl);
      await login(data.username, data.password);
      haptic.success();

      // Offer to enable biometric after first successful login
      if (biometricAvail && !biometricEnabled) {
        setTimeout(() => {
          Alert.alert(
            `Enable ${bioType} Login`,
            `Use ${bioType} to sign in faster next time?`,
            [
              { text: 'Not Now', style: 'cancel' },
              {
                text: 'Enable',
                onPress: async () => {
                  await SecureStore.setItemAsync(BIOMETRIC_CREDS_KEY, JSON.stringify({ username: data.username, password: data.password, serverUrl: data.serverUrl }));
                  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
                  setBiometricEnabled(true);
                },
              },
            ],
          );
        }, 500);
      }
    } catch (e: any) {
      haptic.error();
      Alert.alert('Login Failed', e.message ?? 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const biometricLogin = async () => {
    haptic.light();
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Sign in to Bangladesh OMS`,
      cancelLabel: 'Use Password',
      fallbackLabel: 'Use Password',
    });

    if (result.success) {
      haptic.success();
      const credsJson = await SecureStore.getItemAsync(BIOMETRIC_CREDS_KEY);
      if (!credsJson) {
        Alert.alert('Not configured', 'Please sign in with your password first to enable biometrics.');
        return;
      }
      const creds = JSON.parse(credsJson);
      setLoading(true);
      try {
        await Storage.setBaseUrl(creds.serverUrl);
        await login(creds.username, creds.password);
      } catch (e: any) {
        haptic.error();
        Alert.alert('Login Failed', e.message ?? 'Session expired, please use your password.');
      } finally {
        setLoading(false);
      }
    } else {
      haptic.warning();
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

        {/* Biometric login */}
        {biometricAvail && biometricEnabled && (
          <TouchableOpacity style={styles.biometricBtn} onPress={biometricLogin} activeOpacity={0.8}>
            <Ionicons
              name={bioType === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
              size={28}
              color={Colors.accent.blue}
            />
            <Text style={styles.biometricText}>Sign in with {bioType}</Text>
          </TouchableOpacity>
        )}

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
                  placeholder="http://192.168.0.107:9091"
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

          {/* Biometric shortcut inside form if not yet enabled */}
          {biometricAvail && !biometricEnabled && (
            <TouchableOpacity style={styles.bioSetupBtn} onPress={biometricLogin} activeOpacity={0.7}>
              <Ionicons name="finger-print-outline" size={16} color={Colors.text.muted} />
              <Text style={styles.bioSetupText}>Enable {bioType} login</Text>
            </TouchableOpacity>
          )}
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
                  haptic.light();
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

  biometricBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.sm,
    backgroundColor: Colors.accent.blue + '15',
    borderWidth:     2,
    borderColor:     Colors.accent.blue + '44',
    borderRadius:    BorderRadius.xl,
    padding:         Spacing.lg,
    marginBottom:    Spacing.xl,
  },
  biometricText: { color: Colors.accent.blue, fontSize: Typography.size.base, fontWeight: '700' },

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

  bioSetupBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, paddingVertical: Spacing.xs,
  },
  bioSetupText: { color: Colors.text.muted, fontSize: Typography.size.xs },

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

