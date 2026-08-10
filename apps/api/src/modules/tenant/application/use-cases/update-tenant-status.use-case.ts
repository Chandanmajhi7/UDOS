import { Inject, Injectable } from '@nestjs/common';
import type { DomainEventPublisher } from '../../../../platform/events/domain-event-publisher.port';
import { DOMAIN_EVENT_PUBLISHER } from '../../../../platform/events/domain-event-publisher.port';
import type { PlatformTransactionRunner } from '../../../../platform/persistence/platform-transaction-runner.port';
import { PLATFORM_TRANSACTION_RUNNER } from '../../../../platform/persistence/platform-transaction-runner.port';
import { assertValidTenantStatusTransition, TenantStatus } from '../../domain/tenant-status-transition';
import { TenantNotFoundError } from '../../domain/tenant-not-found.error';
import { TenantStatusChangedEvent } from '../../domain/events/tenant-status-changed.event';
import type { TenantRepository } from '../ports/tenant.repository.port';
import { TENANT_REPOSITORY } from '../ports/tenant.repository.port';

export interface UpdateTenantStatusInput {
  tenantId: string;
  status: TenantStatus;
}

/**
 * Runs on the platform-admin connection (Architecture §6) — same rationale as
 * ProvisionTenantUseCase: suspending/offboarding a tenant is a cross-tenant,
 * platform-level operation, not something the tenant's own scoped connection
 * should be able to do to itself.
 */
@Injectable()
export class UpdateTenantStatusUseCase {
  constructor(
    @Inject(PLATFORM_TRANSACTION_RUNNER) private readonly txRunner: PlatformTransactionRunner,
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async execute(input: UpdateTenantStatusInput): Promise<void> {
    await this.txRunner.run(async (tx) => {
      const tenant = await this.tenants.findByIdInTx(input.tenantId, tx);
      if (!tenant) throw new TenantNotFoundError(input.tenantId);

      const fromStatus = tenant.status as TenantStatus;
      assertValidTenantStatusTransition(fromStatus, input.status);

      await this.tenants.updateStatus(input.tenantId, input.status, tx);
      await this.events.publish(
        new TenantStatusChangedEvent(input.tenantId, fromStatus, input.status, new Date()),
        tx,
      );
    });
  }
}
