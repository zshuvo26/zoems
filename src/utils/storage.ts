import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  TOKEN:       'oms_token',
  USER_ROLE:   'oms_role',
  ACCOUNT_ID:  'oms_account_id',
  BASE_URL:    'oms_base_url',
  USERNAME:    'oms_username',
};

const SECURE_KEYS = {
  CLAUDE_API_KEY: 'oms_claude_api_key',
};

export const Storage = {
  async setToken(token: string) {
    await AsyncStorage.setItem(KEYS.TOKEN, token);
  },
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.TOKEN);
  },
  async setUserInfo(role: string, accountId: string | null, username: string) {
    await AsyncStorage.multiSet([
      [KEYS.USER_ROLE, role],
      [KEYS.ACCOUNT_ID, accountId ?? ''],
      [KEYS.USERNAME, username],
    ]);
  },
  async getUserInfo() {
    const results = await AsyncStorage.multiGet([KEYS.USER_ROLE, KEYS.ACCOUNT_ID, KEYS.USERNAME]);
    return {
      role:      results[0][1] ?? '',
      accountId: results[1][1] ?? '',
      username:  results[2][1] ?? '',
    };
  },
  async setBaseUrl(url: string) {
    await AsyncStorage.setItem(KEYS.BASE_URL, url);
  },
  async getBaseUrl(): Promise<string> {
    return (await AsyncStorage.getItem(KEYS.BASE_URL)) ?? 'http://192.168.0.107:9091';
  },
  async setClaudeApiKey(key: string): Promise<void> {
    await SecureStore.setItemAsync(SECURE_KEYS.CLAUDE_API_KEY, key);
  },
  async getClaudeApiKey(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(SECURE_KEYS.CLAUDE_API_KEY);
    } catch {
      return null;
    }
  },
  async clear() {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  },
};

