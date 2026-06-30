import React, { useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { marketApi } from '../../api';
import { LoadingView, ErrorView } from '../../components/common';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatChangePct, formatCompact } from '../../utils/formatters';
import type { MarketStackProps } from '../../navigation/types';
import type { Instrument } from '../../types/api';

const { width: SCREEN_W } = Dimensions.get('window');

type ExchangeFilter = 'DSE' | 'CSE';
type SizeMode = 'equal' | 'volume';

interface SectorSummary {
  sector: string;
  avgChangePct: number;
  totalVolume: number;
  count: number;
  gainers: number;
  losers: number;
}

function interpolateColor(pct: number): string {
  const capped = Math.max(-5, Math.min(5, pct));
  if (capped >= 0) {
    const intensity = Math.min(capped / 5, 1);
    const r = Math.round(22  + (0   - 22)  * intensity);
    const g = Math.round(163 + (210 - 163) * intensity);
    const b = Math.round(74  + (86  - 74)  * intensity);
    return `rgb(${r},${g},${b})`;
  } else {
    const intensity = Math.min(Math.abs(capped) / 5, 1);
    const r = Math.round(22  + (239 - 22)  * intensity);
    const g = Math.round(163 + (68  - 163) * intensity);
    const b = Math.round(74  + (68  - 74)  * intensity);
    return `rgb(${r},${g},${b})`;
  }
}

export default function SectorHeatmapScreen({ navigation }: MarketStackProps<'SectorHeatmap'>) {
  const [exchange, setExchange] = useState<ExchangeFilter>('DSE');
  const [sizeMode, setSizeMode] = useState<SizeMode>('equal');
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey:        ['scanner', exchange],
    queryFn:         () => marketApi.instruments({ exchange, size: 300 }),
    refetchInterval: 30_000,
  });

  const sectors = useMemo((): SectorSummary[] => {
    const items: Instrument[] = data?.content ?? [];
    const map = new Map<string, { changes: number[]; volumes: number[]; g: number; l: number }>();
    for (const inst of items) {
      const sec = inst.sector || 'Other';
      if (!map.has(sec)) map.set(sec, { changes: [], volumes: [], g: 0, l: 0 });
      const entry = map.get(sec)!;
      entry.changes.push(inst.changePct ?? 0);
      entry.volumes.push(inst.volume ?? 0);
      if ((inst.changePct ?? 0) > 0) entry.g++;
      else if ((inst.changePct ?? 0) < 0) entry.l++;
    }
    return Array.from(map.entries())
      .map(([sector, v]) => ({
        sector,
        avgChangePct: v.changes.reduce((a, b) => a + b, 0) / v.changes.length,
        totalVolume:  v.volumes.reduce((a, b) => a + b, 0),
        count:        v.changes.length,
        gainers:      v.g,
        losers:       v.l,
      }))
      .sort((a, b) => b.avgChangePct - a.avgChangePct);
  }, [data]);

  const maxVol = useMemo(() => Math.max(...sectors.map(s => s.totalVolume), 1), [sectors]);

  if (isLoading) return <LoadingView message="Building sector heatmap…" />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  return (
    <View style={styles.root}>
      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.exchRow}>
          {(['DSE', 'CSE'] as ExchangeFilter[]).map(ex => (
            <TouchableOpacity
              key={ex}
              style={[styles.chip, exchange === ex && styles.chipActive]}
              onPress={() => setExchange(ex)}
            >
              <Text style={[styles.chipText, exchange === ex && styles.chipTextActive]}>{ex}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.sizeRow}>
          <Text style={styles.sizeLabel}>Size by:</Text>
          {(['equal', 'volume'] as SizeMode[]).map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.chip, sizeMode === m && { ...styles.chipActive, backgroundColor: Colors.status.pending + '22', borderColor: Colors.status.pending }]}
              onPress={() => setSizeMode(m)}
            >
              <Text style={[styles.chipText, sizeMode === m && { color: Colors.status.pending }]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={Colors.accent.blue} />}
      >
        {sectors.map(sec => {
          const bgColor  = interpolateColor(sec.avgChangePct);
          const isAbove  = sec.avgChangePct >= 0;
          const volRatio = sizeMode === 'volume' ? Math.max(0.4, sec.totalVolume / maxVol) : 1;
          const cellH    = Math.round(80 + 60 * volRatio);

          return (
            <TouchableOpacity
              key={sec.sector}
              style={[
                styles.cell,
                {
                  backgroundColor: bgColor,
                  height: cellH,
                  opacity: selected && selected !== sec.sector ? 0.65 : 1,
                },
              ]}
              onPress={() => setSelected(prev => prev === sec.sector ? null : sec.sector)}
              activeOpacity={0.85}
            >
              <Text style={styles.cellSector} numberOfLines={2}>{sec.sector}</Text>
              <Text style={styles.cellPct}>
                {sec.avgChangePct >= 0 ? '+' : ''}{sec.avgChangePct.toFixed(2)}%
              </Text>
              <Text style={styles.cellCount}>{sec.count} stocks</Text>
              {selected === sec.sector && (
                <View style={styles.cellDetail}>
                  <Text style={styles.detailText}>▲ {sec.gainers}  ▼ {sec.losers}</Text>
                  <Text style={styles.detailText}>Vol: {formatCompact(sec.totalVolume)}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={[styles.legendLabel, { color: Colors.bear }]}>-5%</Text>
        <View style={styles.legendBar}>
          {Array.from({ length: 20 }, (_, i) => (
            <View key={i} style={[styles.legendSegment, { backgroundColor: interpolateColor((i - 10) / 2) }]} />
          ))}
        </View>
        <Text style={[styles.legendLabel, { color: Colors.bull }]}>+5%</Text>
      </View>
    </View>
  );
}

const CELL_W = (SCREEN_W - Spacing.base * 2 - Spacing.sm) / 2;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },

  controls: {
    backgroundColor: Colors.bg.secondary, padding: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border.subtle, gap: Spacing.xs,
  },
  exchRow: { flexDirection: 'row', gap: Spacing.xs },
  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  sizeLabel:{ color: Colors.text.muted, fontSize: 11 },
  chip: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm,
    borderWidth: 1, borderColor: Colors.border.default, backgroundColor: Colors.bg.primary,
  },
  chipActive:    { backgroundColor: Colors.accent.blue + '22', borderColor: Colors.accent.blue },
  chipText:      { color: Colors.text.muted, fontSize: 11, fontWeight: '600' },
  chipTextActive:{ color: Colors.accent.blue },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.base,
    gap: Spacing.sm, paddingBottom: 60,
  },

  cell: {
    width: CELL_W, borderRadius: BorderRadius.md, padding: Spacing.sm,
    justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  cellSector: { color: Colors.white, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  cellPct:    { color: Colors.white, fontSize: 16, fontWeight: '800', fontFamily: 'monospace' },
  cellCount:  { color: 'rgba(255,255,255,0.75)', fontSize: 10 },
  cellDetail: { gap: 2, marginTop: 2 },
  detailText: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '600', textAlign: 'center' },

  legend: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.bg.secondary + 'EE',
    padding: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border.subtle,
  },
  legendLabel:   { fontSize: 10, fontWeight: '700', width: 28 },
  legendBar:     { flex: 1, flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' },
  legendSegment: { flex: 1 },
});
