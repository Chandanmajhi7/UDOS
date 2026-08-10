import { Prisma } from '@udos/database';
import { DomainEventPublisher } from '../../../../platform/events/domain-event-publisher.port';
import { PlatformTransactionRunner } from '../../../../platform/persistence/platform-transaction-runner.port';
import { TenantRepository } from '../ports/tenant.repository.port';
import { UpdateTenantStatusUseCase } from './update-tenant-status.use-case';
import { TenantNotFoundError } from '../../domain/tenant-not-found.error';
import { InvalidTenantStatusTransitionError } from '../../domain/tenant-status-transition';

describe('UpdateTenantStatusUseCase', () => {
  const fakeTx = {} as Prisma.TransactionClient;

  function buildUseCase(existingTenant: { status: string } | null) {
    const txRunner: PlatformTransactionRunner = { run: jest.fn((work) => work(fakeTx)) };
    const tenants: TenantRepository = {
      existsBySlug: jest.fn(),
      create: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      findByIdInTx: jest.fn().mockResolvedValue(
        existingTenant && {
          id: 'tenant-1',
          slug: 'acme',
          name: 'Acme',
          status: existingTenant.status,
          createdAt: new Date('2026-01-01'),
        },
      ),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    };
    const events: DomainEventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };

    return { useCase: new UpdateTenantStatusUseCase(txRunner, tenants, events), tenants, events };
  }

  it('applies a valid transition and publishes TenantStatusChangedEvent', async () => {
    const { useCase, tenants, events } = buildUseCase({ status: 'ACTIVE' });

    await useCase.execute({ tenantId: 'tenant-1', status: 'SUSPENDED' });

    expect(tenants.updateStatus).toHaveBeenCalledWith('tenant-1', 'SUSPENDED', fakeTx);
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tenant.status_changed',
        tenantId: 'tenant-1',
        fromStatus: 'ACTIVE',
        toStatus: 'SUSPENDED',
      }),
      fakeTx,
    );
  });

  it('rejects when the tenant does not exist', async () => {
    const { useCase, tenants } = buildUseCase(null);

    await expect(useCase.execute({ tenantId: 'missing', status: 'ACTIVE' })).rejects.toThrow(
      TenantNotFoundError,
    );
    expect(tenants.updateStatus).not.toHaveBeenCalled();
  });

  it('rejects an invalid transition without writing anything', async () => {
    const { useCase, tenants, events } = buildUseCase({ status: 'OFFBOARDED' });

    await expect(useCase.execute({ tenantId: 'tenant-1', status: 'ACTIVE' })).rejects.toThrow(
      InvalidTenantStatusTransitionError,
    );
    expect(tenants.updateStatus).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });
});
