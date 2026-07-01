import React from 'react';
import Svg, { Rect, Line, G } from 'react-native-svg';
import { Colors } from '../../theme';

interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Props {
  data: CandleData[];
  width: number;
  height: number;
  bullColor?: string;
  bearColor?: string;
  backgroundColor?: string;
}

export default function CandlestickChart({
  data,
  width,
  height,
  bullColor  = Colors.bull,
  bearColor  = Colors.bear,
  backgroundColor = Colors.bg.secondary,
}: Props) {
  if (!data || data.length === 0) return null;

  const PAD_L = 8;
  const PAD_R = 4;
  const PAD_T = 8;
  const PAD_B = 8;
  const chartW = width - PAD_L - PAD_R;
  const chartH = height - PAD_T - PAD_B;

  const allValues = data.flatMap(d => [d.high, d.low]);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range  = maxVal - minVal || 1;

  const candleW  = Math.max(3, Math.floor(chartW / data.length) - 2);
  const spacing  = (chartW - candleW * data.length) / (data.length + 1);

  const toY = (v: number) => PAD_T + ((maxVal - v) / range) * chartH;

  return (
    <Svg width={width} height={height} style={{ backgroundColor }}>
      {data.map((d, i) => {
        const isBull  = d.close >= d.open;
        const color   = isBull ? bullColor : bearColor;
        const x       = PAD_L + spacing + i * (candleW + spacing);
        const bodyTop = toY(Math.max(d.open, d.close));
        const bodyBot = toY(Math.min(d.open, d.close));
        const bodyH   = Math.max(1, bodyBot - bodyTop);
        const wickX   = x + candleW / 2;

        return (
          <G key={i}>
            {/* High wick */}
            <Line x1={wickX} y1={toY(d.high)} x2={wickX} y2={bodyTop} stroke={color} strokeWidth={1} />
            {/* Low wick */}
            <Line x1={wickX} y1={bodyBot} x2={wickX} y2={toY(d.low)} stroke={color} strokeWidth={1} />
            {/* Body */}
            <Rect
              x={x} y={bodyTop}
              width={candleW} height={bodyH}
              fill={isBull ? color : color}
              fillOpacity={isBull ? 0.9 : 0.9}
              stroke={color}
              strokeWidth={0.5}
            />
          </G>
        );
      })}
    </Svg>
  );
}
