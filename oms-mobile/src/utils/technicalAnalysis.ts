import type { OhlcvBar, Instrument } from '../types/api';

export type SignalType = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

export interface TechnicalSignal {
  symbol: string;
  signal: SignalType;
  score: number;
  confidence: number;
  rsi: number;
  macd: { value: number; signal: number; histogram: number } | null;
  bb: { upper: number; middle: number; lower: number; position: number } | null;
  stochastic: number;
  atr: number;
  support: number;
  resistance: number;
  momentum5d: number;
  volumeTrend: number;
  insights: string[];
}

export interface QuickSignal {
  signal: SignalType;
  score: number;
  confidence: number;
  insight: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function calcEMA(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((a, b) => a + b) / period;
  const result = [ema];
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + avgGain / avgLoss));
}

function calcMACD(closes: number[]): { value: number; signal: number; histogram: number } | null {
  if (closes.length < 35) return null;
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  // ema26[i] corresponds to closes[25+i]; ema12[i] corresponds to closes[11+i]
  // So ema26[i] pairs with ema12[i+14]
  const macdLine = ema26.map((e26, i) => ema12[i + 14] - e26);
  if (macdLine.length < 9) return null;
  const signalLine = calcEMA(macdLine, 9);
  const last = macdLine[macdLine.length - 1];
  const sig = signalLine[signalLine.length - 1];
  return { value: last, signal: sig, histogram: last - sig };
}

function calcBB(closes: number[], period = 20): { upper: number; middle: number; lower: number; position: number } | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const sma = slice.reduce((a, b) => a + b) / period;
  const variance = slice.reduce((acc, v) => acc + (v - sma) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  const upper = sma + 2 * std;
  const lower = sma - 2 * std;
  const last = closes[closes.length - 1];
  const position = upper > lower ? Math.max(0, Math.min(1, (last - lower) / (upper - lower))) : 0.5;
  return { upper, middle: sma, lower, position };
}

function calcStochastic(highs: number[], lows: number[], closes: number[], period = 14): number {
  if (closes.length < period) return 50;
  const rh = highs.slice(-period);
  const rl = lows.slice(-period);
  const hh = Math.max(...rh);
  const ll = Math.min(...rl);
  if (hh === ll) return 50;
  return ((closes[closes.length - 1] - ll) / (hh - ll)) * 100;
}

function calcATR(bars: OhlcvBar[], period = 14): number {
  if (bars.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const h = bars[i].high, l = bars[i].low, pc = bars[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  return trs.slice(-period).reduce((a, b) => a + b) / period;
}

function classifyScore(score: number): SignalType {
  if (score >= 55)  return 'STRONG_BUY';
  if (score >= 20)  return 'BUY';
  if (score <= -55) return 'STRONG_SELL';
  if (score <= -20) return 'SELL';
  return 'HOLD';
}

// ─── Full analysis from 30-day OHLCV bars ────────────────────────────────────

export function analyzeFromBars(symbol: string, bars: OhlcvBar[]): TechnicalSignal {
  const closes  = bars.map(b => b.close);
  const highs   = bars.map(b => b.high);
  const lows    = bars.map(b => b.low);
  const volumes = bars.map(b => b.volume);

  const rsi        = calcRSI(closes);
  const macd       = calcMACD(closes);
  const bb         = calcBB(closes);
  const stochastic = calcStochastic(highs, lows, closes);
  const atr        = calcATR(bars);
  const support    = Math.min(...closes.slice(-20));
  const resistance = Math.max(...closes.slice(-20));

  const momentum5d = closes.length >= 6
    ? ((closes[closes.length - 1] - closes[closes.length - 6]) / closes[closes.length - 6]) * 100
    : 0;

  const vol20avg   = volumes.length >= 21
    ? volumes.slice(-21, -1).reduce((a, b) => a + b) / 20
    : 0;
  const volumeTrend = vol20avg > 0
    ? ((volumes[volumes.length - 1] - vol20avg) / vol20avg) * 100
    : 0;

  let score = 0;
  const insights: string[] = [];

  // RSI (25%)
  let rsiScore = 0;
  if (rsi < 30)      { rsiScore = 60;  insights.push(`RSI ${rsi.toFixed(0)} — oversold, reversal likely`); }
  else if (rsi < 40) { rsiScore = 30;  insights.push(`RSI ${rsi.toFixed(0)} — approaching oversold`); }
  else if (rsi < 55) { rsiScore = 5; }
  else if (rsi > 70) { rsiScore = -60; insights.push(`RSI ${rsi.toFixed(0)} — overbought, pullback risk`); }
  else if (rsi > 60) { rsiScore = -25; insights.push(`RSI ${rsi.toFixed(0)} — approaching overbought`); }
  score += rsiScore * 0.25;

  // MACD (25%)
  if (macd) {
    const ref = Math.abs(macd.signal) > 0.001 ? Math.abs(macd.signal) : 1;
    const macdScore = Math.max(-100, Math.min(100, (macd.histogram / ref) * 60));
    score += macdScore * 0.25;
    if (macd.histogram > 0 && macd.value > 0)       insights.push('MACD bullish above zero line');
    else if (macd.histogram > 0)                     insights.push('MACD gaining upward momentum');
    else if (macd.histogram < 0 && macd.value < 0)  insights.push('MACD bearish below zero line');
    else                                              insights.push('MACD declining from peak');
  }

  // Bollinger Bands (20%)
  if (bb) {
    let bbScore = 0;
    if (bb.position < 0.1)       { bbScore = 70;  insights.push('Price at lower BB — strong mean-reversion signal'); }
    else if (bb.position < 0.25) { bbScore = 40;  insights.push('Price near lower Bollinger Band — buy zone'); }
    else if (bb.position > 0.9)  { bbScore = -70; insights.push('Price at upper BB — overbought extreme'); }
    else if (bb.position > 0.75) { bbScore = -40; insights.push('Price near upper Bollinger Band — consider reducing'); }
    score += bbScore * 0.20;
  }

  // Stochastic (15%)
  let stochScore = 0;
  if (stochastic < 20)      { stochScore = 60; }
  else if (stochastic < 35) { stochScore = 25; }
  else if (stochastic > 80) { stochScore = -60; }
  else if (stochastic > 65) { stochScore = -25; }
  score += stochScore * 0.15;

  // Momentum 5d (10%)
  const momScore = Math.max(-60, Math.min(60, momentum5d * 4));
  score += momScore * 0.10;
  if (momentum5d > 7)       insights.push(`Strong 5-day momentum: +${momentum5d.toFixed(1)}%`);
  else if (momentum5d < -7) insights.push(`Weak 5-day momentum: ${momentum5d.toFixed(1)}%`);

  // Volume (5%)
  if (volumeTrend > 80)      { score += 8;  insights.push(`Volume surge: ${volumeTrend.toFixed(0)}% above 20-day avg`); }
  else if (volumeTrend > 40) { score += 4; }
  else if (volumeTrend < -40){ score -= 4; }

  // Support/resistance
  const last = closes[closes.length - 1];
  if (last <= support * 1.01) insights.push('Price testing 20-day support level');
  if (last >= resistance * 0.99) insights.push('Price testing 20-day resistance level');

  score = Math.max(-100, Math.min(100, score));
  const signal = classifyScore(score);
  const confidence = Math.min(Math.round(Math.abs(score) * 0.6 + 30), 95);

  return { symbol, signal, score, confidence, rsi, macd, bb, stochastic, atr, support, resistance, momentum5d, volumeTrend, insights };
}

// ─── Quick signal from single instrument snapshot ─────────────────────────────

export function quickSignalFromInstrument(inst: Partial<Instrument>): QuickSignal {
  const close  = inst.lastPrice     ?? 0;
  const prev   = inst.previousClose ?? close;
  const high   = inst.highPrice     ?? close;
  const low    = inst.lowPrice      ?? close;
  const open   = inst.openPrice     ?? close;
  const upper  = inst.upperCircuitLimit ?? close * 1.1;
  const lower  = inst.lowerCircuitLimit ?? close * 0.9;
  const dayPct = prev > 0 ? ((close - prev) / prev) * 100 : (inst.changePct ?? 0);

  let score = 0;

  // Day momentum (40%)
  score += Math.max(-40, Math.min(40, dayPct * 4));

  // Intraday range position: close relative to high-low range (30%)
  const range = high - low;
  const rangePos = range > 0 ? (close - low) / range : 0.5;
  if (rangePos > 0.75)      score += 18;
  else if (rangePos < 0.25) score -= 18;

  // Candle body direction (20%)
  if (close > open)      score += 12;
  else if (close < open) score -= 12;

  // Circuit breaker proximity (10%)
  const cRange = upper - lower;
  const cPos   = cRange > 0 ? (close - lower) / cRange : 0.5;
  if (cPos > 0.85)      score -= 12;
  else if (cPos < 0.15) score += 12;

  score = Math.max(-100, Math.min(100, score));
  const signal     = classifyScore(score);
  const confidence = Math.min(Math.round(Math.abs(score) * 0.5 + 20), 80);

  let insight = '';
  if (dayPct > 5)          insight = `Strong day: +${dayPct.toFixed(1)}% — bullish momentum`;
  else if (dayPct < -5)    insight = `Weak day: ${dayPct.toFixed(1)}% — selling pressure`;
  else if (rangePos > 0.8) insight = `Closing near day high — momentum intact`;
  else if (rangePos < 0.2) insight = `Closing near day low — potential reversal zone`;
  else if (cPos < 0.15)    insight = `Near lower circuit — heavily oversold`;
  else if (cPos > 0.85)    insight = `Near upper circuit — overbought`;
  else                     insight = `Day change: ${dayPct >= 0 ? '+' : ''}${dayPct.toFixed(1)}%`;

  return { signal, score, confidence, insight };
}
