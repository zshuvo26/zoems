import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { portfolioApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatBDT, formatChangePct } from '../../utils/formatters';
import type { PortfolioSummary, Position } from '../../types/api';

// ─── Portfolio health computation ─────────────────────────────────────────────

interface HealthBreakdown {
  name: string;
  score: number;
  maxScore: number;
  status: string;
  statusColor: string;
}

interface HealthResult {
  total: number;
  breakdown: HealthBreakdown[];
  recommendations: string[];
}

function computeHealth(p: PortfolioSummary): HealthResult {
  const positions = p.positions ?? [];
  const totalValue = p.portfolioValue ?? 0;
  const recommendations: string[] = [];

  // A) Diversification (25 pts)
  let divScore = 0;
  if (positions.length > 0 && totalValue > 0) {
    const weights = positions.map(pos => (pos.marketValue ?? 0) / totalValue);
    const hhi     = weights.reduce((acc, w) => acc + w * w, 0);
    const n       = positions.length;
    const minHHI  = 1 / n;
    divScore = Math.max(0, 25 * (1 - Math.max(0, (hhi - minHHI) / (1 - minHHI + 0.001))));
    const maxW = Math.max(...weights);
    if (maxW > 0.4) {
      const top = positions.find(pos => Math.abs((pos.marketValue ?? 0) / totalValue - maxW) < 0.001);
      recommendations.push(`${top?.symbol ?? 'Top position'} is ${(maxW * 100).toFixed(0)}% of portfolio — consider trimming`);
    }
    if (n < 3) recommendations.push('Fewer than 3 positions — diversify to reduce concentration risk');
  }

  // B) Profitability (25 pts)
  const pnlPct = p.totalPnlPct ?? 0;
  let profScore = 0;
  if (pnlPct > 15)       profScore = 25;
  else if (pnlPct > 5)   profScore = 20;
  else if (pnlPct > 0)   profScore = 15;
  else if (pnlPct > -5)  profScore = 10;
  else if (pnlPct > -15) profScore = 5;

  // C) Risk Management (25 pts)
  let riskScore = 25;
  const losers      = positions.filter(pos => (pos.totalPnLPct ?? 0) < -5);
  const deepLosers  = positions.filter(pos => (pos.totalPnLPct ?? 0) < -15);
  riskScore -= deepLosers.length * 5;
  if (positions.length > 0 && losers.length > positions.length * 0.5) {
    riskScore -= 8;
    recommendations.push('More than half your positions are in loss — reassess strategy');
  }
  if (deepLosers.length > 0) {
    recommendations.push(`${deepLosers.length} position(s) down >15% — review stop-loss or exit`);
  }
  riskScore = Math.max(0, riskScore);

  // D) Day Performance (25 pts)
  const dayPct = p.dayPnlPct ?? 0;
  let dayScore = 0;
  if (dayPct > 2)       dayScore = 25;
  else if (dayPct > 0.5)dayScore = 20;
  else if (dayPct > 0)  dayScore = 15;
  else if (dayPct > -1) dayScore = 10;
  else if (dayPct > -3) dayScore = 5;

  if (pnlPct > 10 && positions.length >= 3)
    recommendations.push('Strong portfolio performance — consider locking in partial profits');
  if (recommendations.length === 0)
    recommendations.push('Portfolio is well-balanced. Monitor positions for rebalancing opportunities.');

  const total = Math.round(divScore + profScore + riskScore + dayScore);

  const breakdown: HealthBreakdown[] = [
    { name: 'Diversification',   score: Math.round(divScore),  maxScore: 25, status: divScore > 18  ? 'Good'       : divScore > 10  ? 'Fair' : 'Poor',     statusColor: divScore > 18  ? '#00D09C' : divScore > 10  ? '#FFB547' : '#FF4B4B' },
    { name: 'Profitability',     score: profScore,              maxScore: 25, status: pnlPct > 0    ? 'Profitable' : 'Loss',                                 statusColor: pnlPct > 0    ? '#00D09C' : '#FF4B4B' },
    { name: 'Risk Management',   score: riskScore,              maxScore: 25, status: riskScore > 18 ? 'Good'       : riskScore > 10 ? 'Fair' : 'Poor',      statusColor: riskScore > 18 ? '#00D09C' : riskScore > 10 ? '#FFB547' : '#FF4B4B' },
    { name: "Today's Performance",score: dayScore,              maxScore: 25, status: dayPct >= 0   ? 'Positive'   : 'Negative',                             statusColor: dayPct >= 0   ? '#00D09C' : '#FF4B4B' },
  ];

  return { total, breakdown, recommendations };
}

// ─── Components ───────────────────────────────────────────────────────────────

function GaugeScore({ score }: { score: number }) {
  const color = score >= 70 ? '#00D09C' : score >= 40 ? '#FFB547' : '#FF4B4B';
  const label = score >= 70 ? 'Healthy'  : score >= 40 ? 'Fair'    : 'At Risk';
  return (
    <View style={styles.gauge}>
      <View style={[styles.gaugeRing, { borderColor: color }]}>
        <Text style={[styles.gaugeScore, { color }]}>{score}</Text>
        <Text style={styles.gaugeMax}>/100</Text>
      </View>
      <Text style={[styles.gaugeLabel, { color }]}>{label}</Text>
      <Text style={styles.gaugeSub}>AI Health Score</Text>
    </View>
  );
}

function BreakdownCard({ item }: { item: HealthBreakdown }) {
  const fillPct = (item.score / item.maxScore) * 100;
  return (
    <View style={styles.bdCard}>
      <View style={styles.bdRow}>
        <Text style={styles.bdName}>{item.name}</Text>
        <View style={[styles.bdBadge, { backgroundColor: item.statusColor + '22' }]}>
          <Text style={[styles.bdBadgeText, { color: item.statusColor }]}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.bdBarBg}>
        <View style={[styles.bdBarFill, { width: `${fillPct}%`, backgroundColor: item.statusColor }]} />
      </View>
      <Text style={styles.bdScore}>{item.score} / {item.maxScore} pts</Text>
    </View>
  );
}

function PositionRow({ pos }: { pos: Position }) {
  const pnl    = pos.totalPnL   ?? 0;
  const pnlPct = pos.totalPnLPct ?? 0;
  const color  = pnl >= 0 ? '#00D09C' : '#FF4B4B';
  return (
    <View style={styles.posRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.posSymbol}>{pos.symbol}</Text>
        <Text style={styles.posExch}>{pos.exchange} · {pos.netQuantity} shares</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.posPnl, { color }]}>{pnl >= 0 ? '+' : ''}{formatBDT(pnl)}</Text>
        <Text style={[styles.posPnlPct, { color }]}>{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AIPortfolioAdvisorScreen() {
  const { accountId } = useAuthStore();

  const { data: portfolio, isLoading } = useQuery({
    queryKey:  ['portfolio', accountId],
    queryFn:   () => portfolioApi.summary(accountId!),
    enabled:   !!accountId,
    staleTime: 30_000,
  });

  if (!accountId) {
    return (
      <View style={styles.center}>
        <Ionicons name="person-circle-outline" size={64} color={Colors.text.muted} />
        <Text style={styles.emptyTitle}>Trader Account Required</Text>
        <Text style={styles.emptyText}>Log in with a trader account to view AI portfolio analysis</Text>
      </View>
    );
  }

  if (isLoading || !portfolio) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accent.blue} size="large" />
        <Text style={styles.loadingText}>Running AI portfolio analysis…</Text>
      </View>
    );
  }

  const health = computeHealth(portfolio);
  const topPositions = [...(portfolio.positions ?? [])].sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0)).slice(0, 5);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Health Score */}
      <View style={styles.card}>
        <GaugeScore score={health.total} />
      </View>

      {/* Score Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SCORE BREAKDOWN</Text>
        <View style={styles.card}>
          {health.breakdown.map((item, i) => (
            <React.Fragment key={item.name}>
              <BreakdownCard item={item} />
              {i < health.breakdown.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Portfolio Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PORTFOLIO OVERVIEW</Text>
        <View style={[styles.card, styles.statsGrid]}>
          <StatBox label="Total Value"  value={formatBDT(portfolio.portfolioValue)} />
          <StatBox label="Cash"         value={formatBDT(portfolio.cashBalance)} />
          <StatBox
            label="Total P&L"
            value={`${(portfolio.totalPnlPct ?? 0) >= 0 ? '+' : ''}${(portfolio.totalPnlPct ?? 0).toFixed(2)}%`}
            color={(portfolio.totalPnlPct ?? 0) >= 0 ? '#00D09C' : '#FF4B4B'}
          />
          <StatBox
            label="Day P&L"
            value={`${(portfolio.dayPnlPct ?? 0) >= 0 ? '+' : ''}${(portfolio.dayPnlPct ?? 0).toFixed(2)}%`}
            color={(portfolio.dayPnlPct ?? 0) >= 0 ? '#00D09C' : '#FF4B4B'}
          />
        </View>
      </View>

      {/* Top Positions */}
      {topPositions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TOP POSITIONS</Text>
          <View style={styles.card}>
            {topPositions.map((pos, i) => (
              <React.Fragment key={pos.id ?? pos.symbol}>
                <PositionRow pos={pos} />
                {i < topPositions.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        </View>
      )}

      {/* AI Recommendations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI RECOMMENDATIONS</Text>
        <View style={styles.card}>
          {health.recommendations.map((rec, i) => (
            <View key={i} style={styles.recRow}>
              <Ionicons name="sparkles" size={14} color="#9B8CF2" style={{ marginTop: 1 }} />
              <Text style={styles.recText}>{rec}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing.base, gap: Spacing.base, paddingBottom: 40 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'], gap: Spacing.base },
  emptyTitle:  { color: Colors.text.primary, fontSize: Typography.size.lg, fontWeight: '800', textAlign: 'center' },
  emptyText:   { color: Colors.text.muted, fontSize: Typography.size.sm, textAlign: 'center', lineHeight: 20 },
  loadingText: { color: Colors.text.muted, fontSize: Typography.size.sm, marginTop: Spacing.sm },

  card: {
    backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border.subtle, padding: Spacing.base, gap: Spacing.sm,
  },

  section:      { gap: Spacing.xs },
  sectionTitle: { color: Colors.text.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, paddingHorizontal: Spacing.xs },

  divider: { height: 1, backgroundColor: Colors.border.subtle },

  // Gauge
  gauge: { alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.base },
  gaugeRing: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 8, alignItems: 'center', justifyContent: 'center',
  },
  gaugeScore: { fontSize: 36, fontWeight: '900', fontFamily: 'monospace' },
  gaugeMax:   { color: Colors.text.muted, fontSize: 12, fontWeight: '700' },
  gaugeLabel: { fontSize: Typography.size.xl, fontWeight: '900' },
  gaugeSub:   { color: Colors.text.muted, fontSize: Typography.size.xs },

  // Breakdown
  bdCard:     { gap: 6 },
  bdRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bdName:     { color: Colors.text.secondary, fontSize: Typography.size.sm, fontWeight: '700', flex: 1 },
  bdBadge:    { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  bdBadgeText:{ fontSize: 10, fontWeight: '700' },
  bdBarBg:    { height: 4, backgroundColor: Colors.border.default, borderRadius: 2, overflow: 'hidden' },
  bdBarFill:  { height: '100%', borderRadius: 2 },
  bdScore:    { color: Colors.text.muted, fontSize: 10 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0, padding: 0 },
  statBox:   { width: '50%', padding: Spacing.base, gap: 4 },
  statLabel: { color: Colors.text.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  statValue: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '800', fontFamily: 'monospace' },

  // Positions
  posRow:    { flexDirection: 'row', alignItems: 'center' },
  posSymbol: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '800', fontFamily: 'monospace' },
  posExch:   { color: Colors.text.muted, fontSize: 10, marginTop: 2 },
  posPnl:    { fontSize: Typography.size.sm, fontWeight: '700', fontFamily: 'monospace' },
  posPnlPct: { fontSize: 10, fontWeight: '600' },

  // Recommendations
  recRow:  { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  recText: { color: Colors.text.secondary, fontSize: Typography.size.sm, flex: 1, lineHeight: 20 },
});
