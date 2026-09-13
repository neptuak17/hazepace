/**
 * The icon set, vendored from the design prototype.
 *
 * The design uses Lucide at stroke-width 2.75. Rather than take a dependency
 * on `lucide-react-native` for seventeen glyphs, the path data is copied here
 * verbatim from the prototype — it is the same geometry, and it keeps the
 * icons in step with the design rather than with a package's release cycle.
 *
 * Every glyph is drawn on a 24x24 viewBox and inherits `color`, so an icon
 * takes its colour from the caller the way the prototype's `currentColor` did.
 */
import Svg, { Circle, Path } from 'react-native-svg';

type Glyph = {
  paths: string[];
  circles?: { cx: number; cy: number; r: number }[];
  /** A few glyphs are drawn lighter in the design. */
  strokeWidth?: number;
};

const GLYPHS = {
  /** The brand mark: three drifting haze strokes. */
  haze: { paths: ['M3 15h13a3 3 0 1 0-3-3', 'M3 9h7a2.5 2.5 0 1 1-2.5 2.5', 'M6 20h9'] },
  /** The larger haze glyph used inside the launch screen's core. */
  hazeLarge: { paths: ['M2 9h11a3 3 0 1 0-3-3', 'M2 14.5h15a3 3 0 1 1-3 3', 'M4 20h8'] },

  mapPin: {
    paths: ['M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z'],
    circles: [{ cx: 12, cy: 10, r: 2.4 }],
    strokeWidth: 2.5,
  },
  chevronDown: { paths: ['M6 9l6 6 6-6'] },
  chevronRight: { paths: ['M9 6l6 6-6 6'] },
  close: { paths: ['M6 6l12 12M18 6L6 18'] },
  search: { paths: ['M16.5 16.5L21 21'], circles: [{ cx: 11, cy: 11, r: 6.5 }] },

  settings: {
    paths: [
      'M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6',
    ],
    circles: [{ cx: 12, cy: 12, r: 3.2 }],
  },
  person: {
    paths: ['M4.8 20c.9-3.4 3.8-5.3 7.2-5.3s6.3 1.9 7.2 5.3'],
    circles: [{ cx: 12, cy: 8.2, r: 3.6 }],
  },
  help: {
    paths: ['M9.4 9.2a2.7 2.7 0 1 1 3.5 2.6c-.6.2-.9.7-.9 1.4v.6', 'M12 17.2h.01'],
    circles: [{ cx: 12, cy: 12, r: 9.2 }],
  },

  /** Ascending bars — the hourly chart and the comparison row. */
  bars: { paths: ['M4 18v-6M10 18V6M16 18v-9M22 18V9'] },
  flame: { paths: ['M12 3c3 4 5 6 5 9a5 5 0 0 1-10 0c0-1.6.8-3 2-4.5'] },

  /** Threshold tiles. */
  wind: {
    paths: ['M3 9h11a3 3 0 1 0-3-3', 'M3 14h15a3 3 0 1 1-3 3', 'M4 19h7'],
    strokeWidth: 2.5,
  },
  droplet: {
    paths: ['M12 3.4c3 3.6 5.4 6.3 5.4 9.2A5.4 5.4 0 0 1 12 18a5.4 5.4 0 0 1-5.4-5.4c0-2.9 2.4-5.6 5.4-9.2z'],
    strokeWidth: 2.5,
  },
  windAlt: {
    paths: ['M4 8h9.5a2.8 2.8 0 1 0-2.8-2.8', 'M4 12.5h13', 'M4 17h8.5a2.8 2.8 0 1 1-2.8 2.8'],
    strokeWidth: 2.5,
  },

  /** Tab bar. */
  tabToday: { paths: ['M3 12l9-8 9 8', 'M5 10v10h14V10'] },
  tabMap: { paths: ['M9 4l6 2 5-2v14l-5 2-6-2-5 2V6z', 'M9 4v14', 'M15 6v14'] },
  tabForecast: { paths: ['M4 6h16v14H4z', 'M8 3v4', 'M16 3v4', 'M4 11h16'] },
} as const satisfies Record<string, Glyph>;

export type IconName = keyof typeof GLYPHS;

interface IconProps {
  name: IconName;
  size?: number;
  color: string;
  /** Overrides the glyph's own stroke width. */
  strokeWidth?: number;
}

export function Icon({ name, size = 21, color, strokeWidth }: IconProps) {
  const glyph: Glyph = GLYPHS[name];
  const width = strokeWidth ?? glyph.strokeWidth ?? 2.75;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {glyph.circles?.map((c, i) => (
        <Circle
          key={`c${i}`}
          cx={c.cx}
          cy={c.cy}
          r={c.r}
          stroke={color}
          strokeWidth={width}
        />
      ))}
      {glyph.paths.map((d, i) => (
        <Path
          key={`p${i}`}
          d={d}
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
