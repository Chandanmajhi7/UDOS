import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { ChartTokens, DARK_CHART_TOKENS, LIGHT_CHART_TOKENS } from './chart-tokens';

/**
 * Dark mode is a *selected* palette (its own validated steps), not an automatic
 * filter over the light one — see dataviz skill, check 6. mounted guards against
 * rendering the wrong mode's tokens before the client knows the resolved theme.
 */
export function useChartTokens(): { tokens: ChartTokens; mounted: boolean } {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return {
    tokens: resolvedTheme === 'dark' ? DARK_CHART_TOKENS : LIGHT_CHART_TOKENS,
    mounted,
  };
}
