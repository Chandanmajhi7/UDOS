'use client';

import ReactECharts from 'echarts-for-react';
import { TenantStatus } from '../../lib/admin-api-client';
import { useChartTokens } from './use-chart-tokens';

const STATUS_ORDER: { status: TenantStatus; label: string }[] = [
  { status: 'ACTIVE', label: 'Active' },
  { status: 'PENDING', label: 'Pending' },
  { status: 'SUSPENDED', label: 'Suspended' },
  { status: 'OFFBOARDED', label: 'Offboarded' },
];

/**
 * Part-to-whole across 4 fixed, meaningful states → horizontal bar with the status
 * palette (good/warning/serious/critical), not generic categorical hues — these ARE
 * states, not arbitrary series identities (dataviz skill, color-formula.md's
 * "collision rule"). Each bar's category-axis label supplies the required
 * icon+label pairing text-side, since status hues alone are sub-3:1 on light mode
 * by design.
 */
export function StatusBreakdownChart({ byStatus }: { byStatus: Record<TenantStatus, number> }) {
  const { tokens, mounted } = useChartTokens();
  if (!mounted) return <div className="h-45" />;

  const statusColor: Record<TenantStatus, string> = {
    ACTIVE: tokens.statusGood,
    PENDING: tokens.statusWarning,
    SUSPENDED: tokens.statusSerious,
    OFFBOARDED: tokens.statusCritical,
  };

  const option = {
    backgroundColor: 'transparent',
    grid: { left: 90, right: 40, top: 10, bottom: 10, containLabel: false },
    xAxis: {
      type: 'value',
      min: 0,
      // Counts are always whole numbers — without this, ECharts subdivides a small
      // max (e.g. 1) into fractional ticks like 0.2/0.4/0.6, which is nonsensical
      // for a count axis (marks-and-anatomy.md: "round to clean numbers").
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: tokens.gridline } },
      axisLabel: { color: tokens.textMuted },
    },
    yAxis: {
      type: 'category',
      data: STATUS_ORDER.map((s) => s.label),
      axisLine: { lineStyle: { color: tokens.axis } },
      axisTick: { show: false },
      axisLabel: { color: tokens.textPrimary },
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: tokens.surface,
      borderColor: tokens.gridline,
      textStyle: { color: tokens.textPrimary },
    },
    series: [
      {
        type: 'bar',
        barWidth: 20,
        data: STATUS_ORDER.map(({ status }) => ({
          value: byStatus[status],
          itemStyle: { color: statusColor[status], borderRadius: [0, 4, 4, 0] },
        })),
        label: {
          show: true,
          position: 'right',
          color: tokens.textPrimary,
          fontSize: 12,
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 180 }} notMerge />;
}
