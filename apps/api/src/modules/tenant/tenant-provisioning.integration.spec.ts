import { randomUUID } from 'crypto';
import { PlatformPrismaService, PrismaService } from '@udos/database';
import { PrismaPlatformTransactionRunner } from '../../platform/persistence/prisma-platform-transaction-runner';
import { OutboxEventPublisher } from '../../platform/outbox/outbox-event.publisher';
import { PrismaTenantRepository } from './infrastructure/prisma-tenant.repository';
import { ProvisionTenantUseCase } from './application/use-cases/provision-tenant.use-case';
import { TenantSlugAlreadyExistsError } from './domain/tenant-slug-already-exists.error';

/**
 * End-to-end through the real platform-admin connection — proves provisioning works
 * on a role that ordinary tenant-scoped code (udos_app) cannot use (see
 * prisma/migrations/20260806140000_restrict_tenants_table_access), and that the
 * outbox event it publishes is visible afterwards through the ordinary tenant-scoped
 * connection for the newly created tenant, RLS included.
 */
describe('Tenant provisioning (integration)', () => {
  let platformPrisma: PlatformPrismaService;
  let appPrisma: PrismaService;
  let useCase: ProvisionTenantUseCase;
  let slug: string;

  beforeAll(async () => {
    platformPrisma = new PlatformPrismaService();
    await platformPrisma.onModuleInit();
    appPrisma = new PrismaService();
    await appPrisma.onModuleInit();

    useCase = new ProvisionTenantUseCase(
      new PrismaPlatformTransactionRunner(platformPrisma),
      new PrismaTenantRepository(platformPrisma),
      new OutboxEventPublisher(),
    );
  });

  afterAll(async () => {
    await platformPrisma.onModuleDestroy();
    await appPrisma.onModuleDestroy();
  });

  beforeEach(() => {
    slug = `test-college-${randomUUID().slice(0, 8)}`;
  });

  afterEach(async () => {
    await platformPrisma.tenant.deleteMany({ where: { slug } });
  });

  it('creates the tenant and its primary campus, then TenantProvisionedEvent is visible via the tenant-scoped connection', async () => {
    const { tenantId } = await useCase.execute({
      name: 'Test College',
      legalName: 'Test College Pvt Ltd',
      slug,
      primaryCampus: { name: 'Main Campus', code: 'MAIN' },
    });

    const tenant = await platformPrisma.tenant.findUnique({ where: { id: tenantId } });
    expect(tenant).toMatchObject({ slug, name: 'Test College' });

    const campuses = await platformPrisma.campus.findMany({ where: { tenantId } });
    expect(campuses).toHaveLength(1);
    expect(campuses[0]).toMatchObject({ name: 'Main Campus', code: 'MAIN' });

    // Read back through the ordinary RLS-subject connection, scoped to the tenant
    // that was just created — proves the outbox write from the platform-admin
    // transaction is correctly attributed to that tenant, not orphaned or invisible.
    const events = await appPrisma.withTenantContext(tenantId, (tx) =>
      tx.outboxEvent.findMany({ where: { tenantId } }),
    );
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('tenant.provisioned');

    await appPrisma.withTenantContext(tenantId, (tx) =>
      tx.outboxEvent.deleteMany({ where: { tenantId } }),
    );
  });

  it('rejects a second tenant provisioned with the same slug', async () => {
    await useCase.execute({
      name: 'Test College',
      legalName: 'Test College Pvt Ltd',
      slug,
      primaryCampus: { name: 'Main Campus', code: 'MAIN' },
    });

    await expect(
      useCase.execute({
        name: 'Duplicate College',
        legalName: 'Duplicate College Pvt Ltd',
        slug,
        primaryCampus: { name: 'Main Campus', code: 'MAIN' },
      }),
    ).rejects.toThrow(TenantSlugAlreadyExistsError);

    const tenants = await platformPrisma.tenant.findMany({ where: { slug } });
    expect(tenants).toHaveLength(1);

    await platformPrisma.outboxEvent.deleteMany({ where: { tenantId: tenants[0].id } });
  });
});
