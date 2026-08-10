'use client';

import ReactECharts from 'echarts-for-react';
import { useChartTokens } from './use-chart-tokens';

export interface GrowthPoint {
  date: string;
  cumulativeCount: number;
}

/**
 * Single series (cumulative tenant count) → one hue, no legend box (the card title
 * already names it), crosshair+tooltip on hover by default (dataviz skill,
 * interaction.md).
 */
export function GrowthChart({ growth }: { growth: GrowthPoint[] }) {
  const { tokens, mounted } = useChartTokens();
  if (!mounted) return <div className="h-55" />;

  if (growth.length === 0) {
    return (
      <div className="flex h-55 items-center justify-center text-sm text-muted-foreground">
        No tenants yet.
      </div>
    );
  }

  const option = {
    backgroundColor: 'transparent',
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: growth.map((p) => p.date),
      boundaryGap: false,
      axisLine: { lineStyle: { color: tokens.axis } },
      axisTick: { show: false },
      axisLabel: { color: tokens.textMuted },
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: tokens.gridline } },
      axisLabel: { color: tokens.textMuted },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: tokens.surface,
      borderColor: tokens.gridline,
      textStyle: { color: tokens.textPrimary },
    },
    series: [
      {
        type: 'line',
        data: growth.map((p) => p.cumulativeCount),
        lineStyle: { width: 2, color: tokens.seriesBlue },
        itemStyle: { color: tokens.seriesBlue },
        showSymbol: true,
        symbolSize: 8,
        areaStyle: { color: tokens.seriesBlue, opacity: 0.1 },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 220 }} notMerge />;
}
