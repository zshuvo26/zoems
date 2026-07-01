import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { emsApi } from '../../api';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import type { ComponentStats, LatencyAlert, LatencyReport } from '../../types/api';

const COMPONENT_LABELS: Record<string, string> = {
  OMS_EMS:          'OMS → EMS',
  EMS_GATEWAY:      'EMS → Gateway',
  GATEWAY_EXCHANGE: 'Gateway → Exchange',
  EXCHANGE_GATEWAY: 'Exchange → Gateway',
  GATEWAY_OMS:      'Gateway → OMS',
  END_TO_END:       'End-to-End',
};

const PERIOD_OPTIONS = [1, 4, 8, 24];

function LatencyBar({ ms, maxMs = 500 }: { ms: number; maxMs?: number }) {
  const pct = Math.min((ms / maxMs) * 100, 100);
  const color = ms < 50 ? Colors.bull : ms < 200 ? '#FFB547' : Colors.bear;
  return (
    <View style={styles.barBg}>
      <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
    </View>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'GREEN' ? Colors.bull : status === 'YELLOW' ? '#FFB547' : status === 'RED' ? Colors.bear : Colors.text.muted;
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

function ComponentCard({ name, stats }: { name: string; stats: ComponentStats }) {
  const label = COMPONENT_LABELS[name] ?? name;
  return (
    <View style={styles.componentCard}>
      <View style={styles.componentHeader}>
        <StatusDot status={stats.status} />
        <Text style={styles.componentName}>{label}</Text>
        <Text style={[styles.avgMs, { color: stats.status === 'GREEN' ? Colors.bull : stats.status === 'YELLOW' ? '#FFB547' : Colors.bear }]}>
          {stats.avgMs.toFixed(1)}ms avg
        </Text>
      </View>
      <LatencyBar ms={stats.avgMs} />
      <View style={styles.percRow}>
        <View style={styles.percItem}>
          <Text style={styles.percLabel}>p50</Text>
          <Text style={styles.percValue}>{stats.p50Ms.toFixed(0)}ms</Text>
        </View>
        <View style={styles.percItem}>
          <Text style={styles.percLabel}>p95</Text>
          <Text style={styles.percValue}>{stats.p95Ms.toFixed(0)}ms</Text>
        </View>
        <View style={styles.percItem}>
          <Text style={styles.percLabel}>p99</Text>
          <Text style={[styles.percValue, stats.p99Ms >= 200 && { color: Colors.bear }]}>{stats.p99Ms.toFixed(0)}ms</Text>
        </View>
        <View style={styles.percItem}>
          <Text style={styles.percLabel}>Samples</Text>
          <Text style={styles.percValue}>{stats.sampleCount}</Text>
        </View>
        <View style={styles.percItem}>
          <Text style={styles.percLabel}>Alerts</Text>
          <Text style={[styles.percValue, stats.alertCount > 0 && { color: Colors.bear }]}>{stats.alertCount}</Text>
        </View>
      </View>
    </View>
  );
}

function AlertRow({ alert }: { alert: LatencyAlert }) {
  return (
    <View style={styles.alertRow}>
      <View style={[styles.alertDot, { backgroundColor: Colors.bear }]} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.alertComponent}>{COMPONENT_LABELS[alert.component] ?? alert.component}</Text>
          <Text style={[styles.alertMs, { color: Colors.bear }]}>{alert.latencyMs}ms</Text>
        </View>
        <Text style={styles.alertMeta}>
          {alert.timestamp.substring(0, 19).replace('T', ' ')}
          {alert.orderId ? ` · Order ${alert.orderId.substring(0, 8)}…` : ''}
        </Text>
      </View>
    </View>
  );
}

export default function LatencyMonitorScreen() {
  const [period, setPeriod] = useState(24);

  const { data: raw, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['latencyReport', period],
    queryFn: () => emsApi.latencyReport(period),
    refetchInterval: 30_000,
  });
  const report: LatencyReport | undefined = (raw as any)?.data ?? raw;

  const componentOrder = ['OMS_EMS', 'EMS_GATEWAY', 'GATEWAY_EXCHANGE', 'EXCHANGE_GATEWAY', 'GATEWAY_OMS', 'END_TO_END'];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ padding: Spacing.base, gap: Spacing.base, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.accent.blue} />}
    >
      {/* Period Selector */}
      <View style={styles.periodRow}>
        {PERIOD_OPTIONS.map(h => (
          <TouchableOpacity
            key={h}
            style={[styles.periodBtn, period === h && styles.periodBtnActive]}
            onPress={() => setPeriod(h)}
          >
            <Text style={[styles.periodText, period === h && { color: Colors.accent.blue }]}>{h}h</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary */}
      {report && (
        <View style={styles.summaryCard}>
          <View style={styles.sumItem}>
            <Text style={styles.sumValue}>{report.totalSamples.toLocaleString()}</Text>
            <Text style={styles.sumLabel}>Total Samples</Text>
          </View>
          <View style={styles.divV} />
          <View style={styles.sumItem}>
            <Text style={[styles.sumValue, report.totalAlerts > 0 && { color: Colors.bear }]}>
              {report.totalAlerts.toLocaleString()}
            </Text>
            <Text style={styles.sumLabel}>Alerts (&gt;200ms)</Text>
          </View>
          <View style={styles.divV} />
          <View style={styles.sumItem}>
            <Text style={styles.sumValue}>{report.periodHours}</Text>
            <Text style={styles.sumLabel}>Period</Text>
          </View>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legendRow}>
        {[['GREEN', '< 50ms', Colors.bull], ['YELLOW', '< 200ms', '#FFB547'], ['RED', '≥ 200ms', Colors.bear]].map(([s, lbl, c]) => (
          <View key={s} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: c as string }]} />
            <Text style={styles.legendText}>{lbl}</Text>
          </View>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.accent.blue} style={{ marginTop: 40 }} />
      ) : !report || !report.componentStats ? (
        <View style={styles.emptyBox}>
          <Ionicons name="speedometer-outline" size={48} color={Colors.text.muted} />
          <Text style={styles.emptyText}>No latency data yet</Text>
          <Text style={styles.emptyHint}>Data appears once the system routes orders through FIX</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>COMPONENT LATENCIES</Text>
          {componentOrder.map(name => {
            const stats = report.componentStats[name];
            if (!stats) return null;
            return <ComponentCard key={name} name={name} stats={stats} />;
          })}

          {report.recentAlerts.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 8 }]}>RECENT ALERTS</Text>
              <View style={styles.alertsCard}>
                {report.recentAlerts.map((a, i) => (
                  <React.Fragment key={i}>
                    <AlertRow alert={a} />
                    {i < report.recentAlerts.length - 1 && <View style={styles.sep} />}
                  </React.Fragment>
                ))}
              </View>
            </>
          )}
        </>
      )}

      {report && (
        <Text style={styles.footer}>
          Generated {report.reportGeneratedAt?.substring(0, 19).replace('T', ' ')} · Threshold: 200ms
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: Colors.bg.primary },
  periodRow:      { flexDirection: 'row', gap: Spacing.sm },
  periodBtn:      { flex: 1, paddingVertical: 8, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border.default, alignItems: 'center' },
  periodBtnActive:{ borderColor: Colors.accent.blue, backgroundColor: Colors.accent.blue + '22' },
  periodText:     { color: Colors.text.muted, fontWeight: '600', fontSize: Typography.size.sm },
  summaryCard:    { flexDirection: 'row', backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border.subtle, padding: Spacing.base, alignItems: 'center' },
  sumItem:        { flex: 1, alignItems: 'center', gap: 2 },
  sumValue:       { color: Colors.text.primary, fontSize: Typography.size.xl, fontWeight: '800' },
  sumLabel:       { color: Colors.text.muted, fontSize: 10 },
  divV:           { width: 1, height: 36, backgroundColor: Colors.border.subtle },
  legendRow:      { flexDirection: 'row', gap: Spacing.base, paddingHorizontal: 4 },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText:     { color: Colors.text.muted, fontSize: Typography.size.xs },
  dot:            { width: 8, height: 8, borderRadius: 4 },
  sectionTitle:   { color: Colors.text.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  componentCard:  { backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border.subtle, padding: Spacing.base, gap: Spacing.sm },
  componentHeader:{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  componentName:  { flex: 1, color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700' },
  avgMs:          { fontSize: Typography.size.sm, fontWeight: '800' },
  barBg:          { height: 6, backgroundColor: Colors.border.default, borderRadius: 3, overflow: 'hidden' },
  barFill:        { height: '100%', borderRadius: 3 },
  percRow:        { flexDirection: 'row', justifyContent: 'space-between' },
  percItem:       { alignItems: 'center', gap: 2 },
  percLabel:      { color: Colors.text.muted, fontSize: 9, letterSpacing: 0.5 },
  percValue:      { color: Colors.text.primary, fontSize: Typography.size.xs, fontWeight: '700' },
  alertsCard:     { backgroundColor: Colors.bg.secondary, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.bear + '44', overflow: 'hidden' },
  alertRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.sm },
  alertDot:       { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  alertComponent: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: '700' },
  alertMs:        { fontSize: Typography.size.sm, fontWeight: '800' },
  alertMeta:      { color: Colors.text.muted, fontSize: 10, marginTop: 2 },
  sep:            { height: 1, backgroundColor: Colors.border.subtle },
  emptyBox:       { alignItems: 'center', gap: Spacing.sm, paddingTop: 40 },
  emptyText:      { color: Colors.text.muted, fontSize: Typography.size.base, fontWeight: '700' },
  emptyHint:      { color: Colors.text.muted, fontSize: Typography.size.xs, textAlign: 'center' },
  footer:         { color: Colors.text.muted, fontSize: 10, textAlign: 'center', marginTop: 8 },
});
