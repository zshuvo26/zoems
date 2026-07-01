import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { portfolioApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { Storage } from '../../utils/storage';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatBDT } from '../../utils/formatters';

interface Message {
  id:      string;
  role:    'user' | 'assistant';
  content: string;
}

const QUICK_PROMPTS = [
  'Analyze my portfolio',
  'Best buying opportunities',
  'Explain today\'s market',
  'DSEX index outlook',
  'Should I buy GP stock?',
];

const FALLBACK_RESPONSES: Record<string, string> = {
  'Analyze my portfolio':       'Configure your Claude API key in Settings → AI Configuration to get AI-powered portfolio analysis tailored to your holdings.',
  'Best buying opportunities':  'Use the AI Market Intelligence screen to see technical buy/sell signals (RSI, MACD, Bollinger Bands) for all DSE/CSE stocks in real time.',
  'Explain today\'s market':    'Check the Market Breadth widget on the Dashboard for today\'s advance/decline ratio, DSEX index movement, and sector performance.',
  'DSEX index outlook':         '• Monitor circuit breaker levels and sector rotation\n• Banking and telecom sectors often lead DSEX moves\n• Watch FII flow data from DSE website for directional cues',
  'Should I buy GP stock?':     '• Check GP\'s AI signal in AI Market Intelligence screen\n• Review RSI (oversold <30 = buy opportunity)\n• Check MACD for momentum confirmation\n• Always check circuit breaker proximity before entering',
};

async function callClaude(
  messages: { role: 'user' | 'assistant'; content: string }[],
  systemPrompt: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system:     systemPrompt,
      messages,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `API error ${res.status}`);
  }
  const data = await res.json();
  return (data.content?.[0]?.text ?? 'No response received.');
}

function buildSystemPrompt(portfolio?: any): string {
  const today = new Date().toISOString().slice(0, 10);
  let prompt = `You are an expert AI trading assistant for Bangladesh's DSE and CSE stock markets.
You have deep knowledge of BSEC regulations, FIX 4.4 protocol, DSE/CSE listed companies, sector analysis, and technical trading strategies.
Keep responses concise (under 200 words) and mobile-friendly. Use bullet points where helpful.
Today's date: ${today}. Market hours: Sunday–Thursday 10:00–14:30 BST (Bangladesh Standard Time).
Circuit breakers: ±10% individual stock, ±2% index (BSEC mandated).
Settlement: T+2. Currency: BDT (Bangladeshi Taka).`;

  if (portfolio) {
    const top3 = [...(portfolio.positions ?? [])]
      .sort((a: any, b: any) => (b.marketValue ?? 0) - (a.marketValue ?? 0))
      .slice(0, 3)
      .map((p: any) => `${p.symbol} (${p.netQuantity} shares, P&L: ${(p.totalPnLPct ?? 0).toFixed(1)}%)`)
      .join(', ');
    prompt += `\n\nUser's portfolio: Total Value: ${formatBDT(portfolio.portfolioValue)}, Cash: ${formatBDT(portfolio.cashBalance)}, Total P&L: ${(portfolio.totalPnlPct ?? 0).toFixed(2)}%`;
    if (top3) prompt += `\nTop positions: ${top3}`;
  }

  return prompt;
}

export default function AIChatScreen() {
  const { accountId }  = useAuthStore();
  const scrollRef      = useRef<ScrollView>(null);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [isTyping, setIsTyping]   = useState(false);
  const [apiKey, setApiKey]       = useState<string | null>(null);
  const [keyLoaded, setKeyLoaded] = useState(false);

  const { data: portfolio } = useQuery({
    queryKey: ['portfolio', accountId],
    queryFn:  () => portfolioApi.summary(accountId!),
    enabled:  !!accountId,
    staleTime: 60_000,
  });

  useEffect(() => {
    Storage.getClaudeApiKey().then(k => {
      setApiKey(k ?? null);
      setKeyLoaded(true);
    });
  }, []);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    // Scroll to bottom
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    if (!apiKey) {
      // Fallback rule-based response
      const fallback = FALLBACK_RESPONSES[trimmed]
        ?? 'Configure your Claude API key in Settings → AI Configuration to enable the AI Trading Assistant.';
      setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: fallback }]);
        setIsTyping(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }, 600);
      return;
    }

    try {
      const history = newMessages.map(m => ({ role: m.role, content: m.content }));
      const response = await callClaude(history, buildSystemPrompt(portfolio), apiKey);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: response }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id:      Date.now().toString(),
        role:    'assistant',
        content: `Error: ${err.message ?? 'Failed to reach AI'}. Check your API key in Settings.`,
      }]);
    } finally {
      setIsTyping(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const showQuickPrompts = messages.length === 0;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* No API key banner */}
      {keyLoaded && !apiKey && (
        <View style={styles.banner}>
          <Ionicons name="information-circle" size={16} color="#FFB547" />
          <Text style={styles.bannerText}>
            Add your Claude API key in Settings → AI Configuration for full AI responses
          </Text>
        </View>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {showQuickPrompts && (
          <View style={styles.welcome}>
            <View style={styles.welcomeIcon}>
              <Ionicons name="sparkles" size={32} color="#9B8CF2" />
            </View>
            <Text style={styles.welcomeTitle}>AI Trading Assistant</Text>
            <Text style={styles.welcomeSub}>
              Expert knowledge of DSE/CSE markets, BSEC regulations, and technical analysis
            </Text>
            <Text style={styles.promptsLabel}>Quick prompts</Text>
            <View style={styles.prompts}>
              {QUICK_PROMPTS.map(p => (
                <TouchableOpacity key={p} style={styles.promptChip} onPress={() => send(p)}>
                  <Text style={styles.promptText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {messages.map(msg => (
          <View key={msg.id} style={[styles.msgRow, msg.role === 'user' ? styles.userRow : styles.asstRow]}>
            {msg.role === 'assistant' && (
              <View style={styles.asstAvatar}>
                <Ionicons name="sparkles" size={12} color="#9B8CF2" />
              </View>
            )}
            <View style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.asstBubble]}>
              <Text style={[styles.msgText, msg.role === 'user' ? styles.userText : styles.asstText]}>
                {msg.content}
              </Text>
            </View>
          </View>
        ))}

        {isTyping && (
          <View style={[styles.msgRow, styles.asstRow]}>
            <View style={styles.asstAvatar}>
              <Ionicons name="sparkles" size={12} color="#9B8CF2" />
            </View>
            <View style={[styles.bubble, styles.asstBubble, styles.typingBubble]}>
              <ActivityIndicator size="small" color="#9B8CF2" />
              <Text style={styles.typingText}>AI is thinking…</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input bar */}
      <View style={styles.inputBar}>
        {messages.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={() => setMessages([])}>
            <Ionicons name="trash-outline" size={18} color={Colors.text.muted} />
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about stocks, portfolio, market…"
          placeholderTextColor={Colors.text.muted}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={() => send(input)}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || isTyping) && styles.sendBtnDisabled]}
          onPress={() => send(input)}
          disabled={!input.trim() || isTyping}
        >
          <Ionicons name="send" size={18} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: '#FFB547' + '18', borderBottomWidth: 1, borderBottomColor: '#FFB547' + '44',
    padding: Spacing.sm + 2, paddingHorizontal: Spacing.base,
  },
  bannerText: { color: '#FFB547', fontSize: 11, flex: 1, lineHeight: 16 },

  messages:        { flex: 1 },
  messagesContent: { padding: Spacing.base, gap: Spacing.sm, paddingBottom: Spacing.base },

  welcome: { alignItems: 'center', gap: Spacing.base, paddingVertical: Spacing.xl },
  welcomeIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#9B8CF2' + '22', alignItems: 'center', justifyContent: 'center',
  },
  welcomeTitle: { color: Colors.text.primary, fontSize: Typography.size.xl, fontWeight: '900' },
  welcomeSub:   { color: Colors.text.muted, fontSize: Typography.size.sm, textAlign: 'center', lineHeight: 20 },
  promptsLabel: { color: Colors.text.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, alignSelf: 'flex-start', marginTop: Spacing.sm },
  prompts: { gap: Spacing.xs, alignSelf: 'stretch' },
  promptChip: {
    backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border.default,
    padding: Spacing.sm + 2, paddingHorizontal: Spacing.base,
  },
  promptText: { color: Colors.text.secondary, fontSize: Typography.size.sm, fontWeight: '600' },

  msgRow:  { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs, maxWidth: '100%' },
  userRow: { justifyContent: 'flex-end' },
  asstRow: { justifyContent: 'flex-start' },

  asstAvatar: {
    width: 24, height: 24, borderRadius: 8,
    backgroundColor: '#9B8CF2' + '22', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  bubble:     { maxWidth: '80%', borderRadius: BorderRadius.lg, padding: Spacing.sm + 2, paddingHorizontal: Spacing.base },
  userBubble: { backgroundColor: Colors.accent.blue, borderBottomRightRadius: 4 },
  asstBubble: { backgroundColor: Colors.bg.secondary, borderWidth: 1, borderColor: Colors.border.default, borderBottomLeftRadius: 4 },
  msgText:    { fontSize: Typography.size.sm, lineHeight: 20 },
  userText:   { color: Colors.white },
  asstText:   { color: Colors.text.primary },

  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  typingText:   { color: Colors.text.muted, fontSize: Typography.size.xs },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs,
    padding: Spacing.sm, paddingHorizontal: Spacing.base,
    backgroundColor: Colors.bg.secondary,
    borderTopWidth: 1, borderTopColor: Colors.border.default,
  },
  clearBtn: { padding: 8, marginBottom: 2 },
  textInput: {
    flex: 1, backgroundColor: Colors.bg.tertiary, borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    color: Colors.text.primary, fontSize: Typography.size.sm, maxHeight: 120,
  },
  sendBtn:         { backgroundColor: '#9B8CF2', borderRadius: BorderRadius.full, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: Colors.bg.tertiary },
});
