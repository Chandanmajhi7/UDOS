import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PlatformPrismaService } from '@udos/database';
import { PlatformModule } from '../../platform/platform.module';
import { OutboxRelay } from '../../platform/outbox/outbox-relay';
import { TenantModule } from '../tenant/tenant.module';
import { ProvisionTenantUseCase } from '../tenant/application/use-cases/provision-tenant.use-case';
import { AuditModule } from './audit.module';

/**
 * The capstone Wave 0 test: provisioning a tenant (Tenant module) durably records an
 * event (outbox), OutboxRelay delivers it to in-process subscribers, and the Audit
 * module (listening generically, per Architecture §2) turns it into an audit_logs
 * row — all wired through real Nest DI, a real EventEmitter2 instance, and a real
 * Postgres database. Nothing about this path is mocked.
 */
describe('Outbox -> Audit pipeline (integration)', () => {
  let app: INestApplication;
  let platformPrisma: PlatformPrismaService;
  let provisionTenant: ProvisionTenantUseCase;
  let outboxRelay: OutboxRelay;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PlatformModule, TenantModule, AuditModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    platformPrisma = app.get(PlatformPrismaService);
    provisionTenant = app.get(ProvisionTenantUseCase);
    outboxRelay = app.get(OutboxRelay);
  });

  afterAll(async () => {
    await app.close();
  });

  it('turns a TenantProvisionedEvent into a durable audit log entry via the relay', async () => {
    const slug = `audit-pipeline-${Date.now()}`;

    const { tenantId } = await provisionTenant.execute({
      name: 'Audit Pipeline Test College',
      legalName: 'Audit Pipeline Test College Pvt Ltd',
      slug,
      primaryCampus: { name: 'Main Campus', code: 'MAIN' },
    });

    const relayed = await outboxRelay.pollOnce();
    expect(relayed).toBeGreaterThanOrEqual(1);

    const outboxRow = await platformPrisma.outboxEvent.findFirst({
      where: { tenantId, eventType: 'tenant.provisioned' },
    });
    expect(outboxRow?.processedAt).not.toBeNull();

    const auditRows = await platformPrisma.auditLog.findMany({ where: { tenantId } });
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]).toMatchObject({
      action: 'tenant.provisioned',
      entityType: 'tenant',
      entityId: tenantId,
    });
    expect(auditRows[0].afterState).toMatchObject({ slug });

    await platformPrisma.auditLog.deleteMany({ where: { tenantId } });
    await platformPrisma.outboxEvent.deleteMany({ where: { tenantId } });
    await platformPrisma.campus.deleteMany({ where: { tenantId } });
    await platformPrisma.tenant.deleteMany({ where: { id: tenantId } });
  });
});
