import { randomUUID } from 'crypto';
import { PlatformPrismaService, PrismaService } from '@udos/database';
import { RoleAssignedEvent } from '../../modules/iam/domain/events/role-assigned.event';
import { OutboxEventPublisher } from './outbox-event.publisher';

describe('OutboxEventPublisher (integration)', () => {
  let prisma: PrismaService;
  let platformPrisma: PlatformPrismaService;
  let publisher: OutboxEventPublisher;
  let tenantId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    platformPrisma = new PlatformPrismaService();
    await platformPrisma.onModuleInit();
    publisher = new OutboxEventPublisher();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
    await platformPrisma.onModuleDestroy();
  });

  beforeEach(async () => {
    // Tenant creation is a platform-admin operation (see
    // prisma/migrations/20260806140000_restrict_tenants_table_access) — udos_app
    // cannot write to `tenants` at all, by design.
    tenantId = randomUUID();
    await platformPrisma.tenant.create({
      data: {
        id: tenantId,
        name: 'Outbox Test Tenant',
        legalName: 'Outbox Test Tenant Pvt Ltd',
        slug: `outbox-test-${tenantId}`,
      },
    });
  });

  afterEach(async () => {
    // outbox_events IS tenant-scoped, so this cleanup goes through the ordinary
    // RLS-subject connection — this is the realistic path once a tenant exists.
    await prisma.withTenantContext(tenantId, (tx) =>
      tx.outboxEvent.deleteMany({ where: { tenantId } }),
    );
    await platformPrisma.tenant.deleteMany({ where: { id: tenantId } });
  });

  it('durably records the event, scoped to the publishing tenant', async () => {
    const event = new RoleAssignedEvent(tenantId, 'user-1', 'role-1', {}, new Date());

    await prisma.withTenantContext(tenantId, async (tx) => {
      await publisher.publish(event, tx);
    });

    const rows = await prisma.withTenantContext(tenantId, (tx) =>
      tx.outboxEvent.findMany({ where: { tenantId } }),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].eventType).toBe('iam.role_assigned');
    expect(rows[0].payload).toMatchObject({ userId: 'user-1', roleId: 'role-1' });
    expect(rows[0].processedAt).toBeNull();
  });

  it('is invisible to a different tenant context (RLS-enforced)', async () => {
    await prisma.withTenantContext(tenantId, async (tx) => {
      await publisher.publish({ type: 'iam.role_assigned', tenantId }, tx);
    });

    const strangerId = randomUUID();
    const rows = await prisma.withTenantContext(strangerId, (tx) => tx.outboxEvent.findMany());

    expect(rows).toHaveLength(0);
  });
});
