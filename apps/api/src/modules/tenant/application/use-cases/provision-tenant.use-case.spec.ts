import { Prisma } from '@udos/database';
import { DomainEventPublisher } from '../../../../platform/events/domain-event-publisher.port';
import { PlatformTransactionRunner } from '../../../../platform/persistence/platform-transaction-runner.port';
import { TenantRepository } from '../ports/tenant.repository.port';
import { ProvisionTenantUseCase } from './provision-tenant.use-case';
import { TenantSlugAlreadyExistsError } from '../../domain/tenant-slug-already-exists.error';

describe('ProvisionTenantUseCase', () => {
  const fakeTx = {} as Prisma.TransactionClient;

  function buildUseCase(existsBySlug = false) {
    const txRunner: PlatformTransactionRunner = {
      run: jest.fn((work) => work(fakeTx)),
    };
    const tenants: TenantRepository = {
      existsBySlug: jest.fn().mockResolvedValue(existsBySlug),
      create: jest.fn().mockResolvedValue(undefined),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      findByIdInTx: jest.fn(),
      updateStatus: jest.fn(),
    };
    const events: DomainEventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };

    return { useCase: new ProvisionTenantUseCase(txRunner, tenants, events), tenants, events };
  }

  it('normalizes the slug, creates the tenant and its primary campus, and publishes TenantProvisionedEvent', async () => {
    const { useCase, tenants, events } = buildUseCase();

    const result = await useCase.execute({
      name: 'Acme College',
      legalName: 'Acme College Pvt Ltd',
      slug: 'Acme-College',
      primaryCampus: { name: 'Main Campus', code: 'MAIN' },
    });

    expect(result.tenantId).toEqual(expect.any(String));
    expect(tenants.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: result.tenantId,
        slug: 'acme-college',
        countryCode: 'IN',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        primaryCampus: { name: 'Main Campus', code: 'MAIN' },
      }),
      fakeTx,
    );
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tenant.provisioned',
        tenantId: result.tenantId,
        slug: 'acme-college',
      }),
      fakeTx,
    );
  });

  it('rejects an invalid slug before touching the repository', async () => {
    const { useCase, tenants } = buildUseCase();

    await expect(
      useCase.execute({
        name: 'Acme',
        legalName: 'Acme Pvt Ltd',
        slug: 'not a valid slug!',
        primaryCampus: { name: 'Main', code: 'MAIN' },
      }),
    ).rejects.toThrow(/lowercase alphanumeric/);
    expect(tenants.create).not.toHaveBeenCalled();
  });

  it('rejects provisioning when the slug is already taken', async () => {
    const { useCase, tenants } = buildUseCase(true);

    await expect(
      useCase.execute({
        name: 'Acme',
        legalName: 'Acme Pvt Ltd',
        slug: 'acme',
        primaryCampus: { name: 'Main', code: 'MAIN' },
      }),
    ).rejects.toThrow(TenantSlugAlreadyExistsError);
    expect(tenants.create).not.toHaveBeenCalled();
  });
});
