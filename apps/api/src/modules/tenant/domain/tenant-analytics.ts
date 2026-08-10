import { TenantStatus } from './tenant-status-transition';

export interface TenantAnalytics {
  totalTenants: number;
  byStatus: Record<TenantStatus, number>;
  /** Cumulative tenant count by day, oldest first — a growth curve, not a per-day delta. */
  growth: { date: string; cumulativeCount: number }[];
}

export interface TenantForAnalytics {
  status: TenantStatus;
  createdAt: Date;
}

export function computeTenantAnalytics(tenants: TenantForAnalytics[]): TenantAnalytics {
  const byStatus: Record<TenantStatus, number> = {
    PENDING: 0,
    ACTIVE: 0,
    SUSPENDED: 0,
    OFFBOARDED: 0,
  };
  for (const tenant of tenants) byStatus[tenant.status] += 1;

  const sortedByDate = [...tenants].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const countsByDate = new Map<string, number>();
  for (const tenant of sortedByDate) {
    const date = tenant.createdAt.toISOString().slice(0, 10);
    countsByDate.set(date, (countsByDate.get(date) ?? 0) + 1);
  }

  let cumulative = 0;
  const growth = Array.from(countsByDate.entries()).map(([date, count]) => {
    cumulative += count;
    return { date, cumulativeCount: cumulative };
  });

  return { totalTenants: tenants.length, byStatus, growth };
}
