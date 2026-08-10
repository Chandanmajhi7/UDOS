/**
 * Chart color tokens — verbatim values from the dataviz skill's reference palette
 * (references/palette.md), already validated (worst adjacent CVD ΔE 9.1 light /
 * 8.4 dark, normal-vision floor 19.6 light / 19.3 dark). Not re-validated here
 * because nothing is being invented — these are the documented default steps.
 *
 * Status colors are mode-invariant by design (same four steps in both modes,
 * chosen to stay distinct from the categorical slots either way).
 */
export interface ChartTokens {
  surface: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  gridline: string;
  axis: string;
  seriesBlue: string;
  statusGood: string;
  statusWarning: string;
  statusSerious: string;
  statusCritical: string;
}

const SHARED_STATUS = {
  statusGood: '#0ca30c',
  statusWarning: '#fab219',
  statusSerious: '#ec835a',
  statusCritical: '#d03b3b',
} as const;

export const LIGHT_CHART_TOKENS: ChartTokens = {
  surface: '#fcfcfb',
  textPrimary: '#0b0b0b',
  textSecondary: '#52514e',
  textMuted: '#898781',
  gridline: '#e1e0d9',
  axis: '#c3c2b7',
  seriesBlue: '#2a78d6',
  ...SHARED_STATUS,
};

export const DARK_CHART_TOKENS: ChartTokens = {
  surface: '#1a1a19',
  textPrimary: '#ffffff',
  textSecondary: '#c3c2b7',
  textMuted: '#898781',
  gridline: '#2c2c2a',
  axis: '#383835',
  seriesBlue: '#3987e5',
  ...SHARED_STATUS,
};
