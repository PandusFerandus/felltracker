import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { colors } from '@/theme';

export function SettingsIcon({ size = 26, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={3} />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
      <Circle cx={12} cy={12} r={7} />
    </Svg>
  );
}

export function PawIcon({ size = 104, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <G fill={color}>
        <Ellipse cx={11} cy={21} rx={4.5} ry={6} />
        <Ellipse cx={19} cy={12} rx={4.5} ry={6} />
        <Ellipse cx={29} cy={12} rx={4.5} ry={6} />
        <Ellipse cx={37} cy={21} rx={4.5} ry={6} />
        <Path d="M24 22c7 0 13 8 12 13-1 5-7 3-12 3s-11 2-12-3c-1-5 5-13 12-13z" />
      </G>
    </Svg>
  );
}

type IconProps = { size?: number; color?: string };

export function ChevronDownIcon({ size = 22, color = colors.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function BackIcon({ size = 24, color = colors.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 5l-7 7 7 7" />
    </Svg>
  );
}

/** Einfaches Strich-Symbol aus einem SVG-Pfad (für die Kacheln der Startseite). */
export function LineIcon({ d, size = 28, color = colors.primary }: IconProps & { d: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}
