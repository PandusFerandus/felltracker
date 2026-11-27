import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { fromDateKey, longDate } from '@/data/dates';
import { formatWeight } from '@/data/entry-logic';
import type { WeightPoint } from '@/data/month-logic';
import type { DateKey } from '@/data/types';
import { colors } from '@/theme';

const HEIGHT = 110;
const PAD = 8;

/** Gewichtskurve eines Monats. Waagrecht nach Tag im Monat, senkrecht nach Gewicht. */
export function WeightChart({ points, daysInMonth, today }: { points: WeightPoint[]; daysInMonth: number; today: DateKey }) {
  const [width, setWidth] = useState(0);
  const kgs = points.map((p) => p.kg);
  const lo = Math.min(...kgs) - 0.2;
  const hi = Math.max(...kgs) + 0.2;
  const xy = points.map((p) => {
    const day = fromDateKey(p.date).getDate();
    const x = PAD + ((day - 1) / Math.max(1, daysInMonth - 1)) * (width - 2 * PAD);
    const y = PAD + (1 - (p.kg - lo) / (hi - lo)) * (HEIGHT - 2 * PAD);
    return { x, y };
  });
  const first = points[0];
  const last = points[points.length - 1];
  const label = `Gewichtskurve: ${formatWeight(first.kg)} kg am ${longDate(first.date, today)}, ${formatWeight(last.kg)} kg am ${longDate(last.date, today)}`;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: HEIGHT }} accessible accessibilityRole="image" accessibilityLabel={label}>
      {width > 0 && (
        <Svg width={width} height={HEIGHT}>
          <Line x1={PAD} y1={HEIGHT - 1} x2={width - PAD} y2={HEIGHT - 1} stroke={colors.surfaceLight} strokeWidth={2} />
          <Polyline
            points={xy.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
            fill="none"
            stroke={colors.primary}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {xy.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={4.5} fill={colors.card} stroke={colors.primary} strokeWidth={3} />
          ))}
        </Svg>
      )}
    </View>
  );
}
