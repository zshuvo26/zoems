import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { OrderStatus, AlgoStatus } from '../types/api';
import { Colors } from '../theme';

// ── Currency ─────────────────────────────────────────────────────────────────
export function formatBDT(value: number | null | undefined, decimals = 2): string {
  if (value == null) return '—';
  const n = Number(value);
  if (isNaN(n)) return '—';
  return `৳ ${n.toLocaleString('en-BD', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function formatPrice(value: number | null | undefined, decimals = 2): string {
  if (value == null) return '—';
  const n = Number(value);
  return n.toLocaleString('en-BD', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatCompact(value: number): string {
  if (value >= 1_00_00_000) return `৳ ${(value / 1_00_00_000).toFixed(2)} Cr`;
  if (value >= 1_00_000)    return `৳ ${(value / 1_00_000).toFixed(2)} L`;
  if (value >= 1_000)       return `৳ ${(value / 1_000).toFixed(1)} K`;
  return formatBDT(value);
}

export function formatVolume(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000)     return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

// ── Change / % ────────────────────────────────────────────────────────────────
export function formatChange(value: number, sign = true): string {
  const prefix = sign && value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}`;
}

export function formatChangePct(value: number, sign = true): string {
  const prefix = sign && value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

export function changeColor(value: number): string {
  if (value > 0)  return Colors.bull;
  if (value < 0)  return Colors.bear;
  return Colors.flat;
}

// ── Dates ─────────────────────────────────────────────────────────────────────
export function formatDateTime(iso: string): string {
  try { return format(parseISO(iso), 'dd MMM yyyy, HH:mm:ss'); } catch { return iso; }
}

export function formatDate(iso: string): string {
  try { return format(parseISO(iso), 'dd MMM yyyy'); } catch { return iso; }
}

export function formatTime(iso: string): string {
  try { return format(parseISO(iso), 'HH:mm:ss'); } catch { return iso; }
}

export function timeAgo(iso: string): string {
  try { return formatDistanceToNow(parseISO(iso), { addSuffix: true }); } catch { return iso; }
}

// ── Order / Status ────────────────────────────────────────────────────────────
export function orderStatusColor(status: OrderStatus): string {
  return Colors.order[status.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase()) as keyof typeof Colors.order] ?? Colors.flat;
}

export function algoStatusColor(status: AlgoStatus): string {
  switch (status) {
    case 'RUNNING':   return Colors.bull;
    case 'PAUSED':    return Colors.status.warning;
    case 'COMPLETED': return Colors.status.success;
    case 'CANCELLED': return Colors.flat;
    case 'FAILED':    return Colors.bear;
    default:          return Colors.flat;
  }
}

export function formatQuantity(qty: number): string {
  return qty.toLocaleString('en-BD');
}

export function formatBps(bps: number): string {
  return `${bps.toFixed(1)} bps`;
}
