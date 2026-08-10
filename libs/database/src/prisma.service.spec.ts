import { randomUUID } from 'crypto';
import { PrismaService } from './prisma.service';
import { PlatformPrismaService } from './platform-prisma.service';

/**
 * Integration test — runs against a real local Postgres (see docs/phase-3-database-design.md §3).
 * Connects as the least-privilege `udos_app` role specifically so these assertions
 * exercise the actual RLS policies, not an application-layer approximation of them.
 * Requires DATABASE_URL to be set (libs/database/jest.config.cts loads .env via dotenv/config).
 */
describe('PrismaService — RLS-enforced tenant isolation', () => {
  let service: PrismaService;
  let platformService: PlatformPrismaService;
  let tenantAId: string;
  let tenantBId: string;

  beforeAll(async () => {
    service = new PrismaService();
    await service.onModuleInit();
    platformService = new PlatformPrismaService();
    await platformService.onModuleInit();
  });

  afterAll(async () => {
    await service.onModuleDestroy();
    await platformService.onModuleDestroy();
  });

  beforeEach(async () => {
    tenantAId = randomUUID();
    tenantBId = randomUUID();

    // Tenant rows themselves are created via the platform-admin connection, not
    // udos_app — udos_app has no write access to `tenants` at all (see
    // prisma/migrations/20260806140000_restrict_tenants_table_access), independent
    // of RLS: `tenants` has no tenant_id column to apply a policy to in the first
    // place, since it IS the tenant root.
    await platformService.tenant.create({
      data: { id: tenantAId, name: 'Tenant A', legalName: 'Tenant A Pvt Ltd', slug: `tenant-a-${tenantAId}` },
    });
    await platformService.tenant.create({
      data: { id: tenantBId, name: 'Tenant B', legalName: 'Tenant B Pvt Ltd', slug: `tenant-b-${tenantBId}` },
    });

    // Campuses ARE tenant-owned (RLS-protected), so these go through the ordinary
    // tenant-scoped connection — this is the realistic path for post-provisioning writes.
    await service.withTenantContext(tenantAId, (tx) =>
      tx.campus.create({ data: { tenantId: tenantAId, name: 'Tenant A Main Campus', code: 'MAIN' } }),
    );
    await service.withTenantContext(tenantBId, (tx) =>
      tx.campus.create({ data: { tenantId: tenantBId, name: 'Tenant B Main Campus', code: 'MAIN' } }),
    );
  });

  afterEach(async () => {
    // Cleanup runs scoped to each tenant so it also exercises RLS on DELETE, not just
    // a superuser-style wipe.
    await service.withTenantContext(tenantAId, (tx) => tx.campus.deleteMany({ where: { tenantId: tenantAId } }));
    await service.withTenantContext(tenantBId, (tx) => tx.campus.deleteMany({ where: { tenantId: tenantBId } }));
    await platformService.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
  });

  it('scopes reads to the active tenant only', async () => {
    const tenantACampuses = await service.withTenantContext(tenantAId, (tx) =>
      tx.campus.findMany(),
    );

    expect(tenantACampuses).toHaveLength(1);
    expect(tenantACampuses[0].tenantId).toBe(tenantAId);
  });

  it('returns zero rows for a tenant with no data, never another tenant\'s rows', async () => {
    const strangerId = randomUUID();

    const rows = await service.withTenantContext(strangerId, (tx) => tx.campus.findMany());

    expect(rows).toHaveLength(0);
  });

  it('rejects a write whose tenant_id does not match the active session context', async () => {
    await expect(
      service.withTenantContext(tenantAId, (tx) =>
        tx.campus.create({
          data: { tenantId: tenantBId, name: 'Sneaky Campus', code: 'SNEAK' },
        }),
      ),
    ).rejects.toThrow();
  });
});
