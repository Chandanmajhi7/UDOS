import { computeTenantAnalytics } from './tenant-analytics';

describe('computeTenantAnalytics', () => {
  it('returns zeroed counts and empty growth for no tenants', () => {
    const result = computeTenantAnalytics([]);

    expect(result).toEqual({
      totalTenants: 0,
      byStatus: { PENDING: 0, ACTIVE: 0, SUSPENDED: 0, OFFBOARDED: 0 },
      growth: [],
    });
  });

  it('counts tenants by status', () => {
    const result = computeTenantAnalytics([
      { status: 'ACTIVE', createdAt: new Date('2026-01-01') },
      { status: 'ACTIVE', createdAt: new Date('2026-01-02') },
      { status: 'SUSPENDED', createdAt: new Date('2026-01-03') },
      { status: 'PENDING', createdAt: new Date('2026-01-04') },
    ]);

    expect(result.totalTenants).toBe(4);
    expect(result.byStatus).toEqual({ PENDING: 1, ACTIVE: 2, SUSPENDED: 1, OFFBOARDED: 0 });
  });

  it('builds a cumulative growth curve ordered oldest to newest, grouping same-day signups', () => {
    const result = computeTenantAnalytics([
      { status: 'ACTIVE', createdAt: new Date('2026-01-03T10:00:00Z') },
      { status: 'ACTIVE', createdAt: new Date('2026-01-01T09:00:00Z') },
      { status: 'ACTIVE', createdAt: new Date('2026-01-01T15:00:00Z') }, // same day as above
      { status: 'ACTIVE', createdAt: new Date('2026-01-02T09:00:00Z') },
    ]);

    expect(result.growth).toEqual([
      { date: '2026-01-01', cumulativeCount: 2 },
      { date: '2026-01-02', cumulativeCount: 3 },
      { date: '2026-01-03', cumulativeCount: 4 },
    ]);
  });
});
