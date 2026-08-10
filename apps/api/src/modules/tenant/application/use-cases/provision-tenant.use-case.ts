import { randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { DomainEventPublisher } from '../../../../platform/events/domain-event-publisher.port';
import { DOMAIN_EVENT_PUBLISHER } from '../../../../platform/events/domain-event-publisher.port';
import type { PlatformTransactionRunner } from '../../../../platform/persistence/platform-transaction-runner.port';
import { PLATFORM_TRANSACTION_RUNNER } from '../../../../platform/persistence/platform-transaction-runner.port';
import { TenantSlug } from '../../domain/tenant-slug.vo';
import { TenantSlugAlreadyExistsError } from '../../domain/tenant-slug-already-exists.error';
import { TenantProvisionedEvent } from '../../domain/events/tenant-provisioned.event';
import type { TenantRepository } from '../ports/tenant.repository.port';
import { TENANT_REPOSITORY } from '../ports/tenant.repository.port';

export interface ProvisionTenantInput {
  name: string;
  legalName: string;
  slug: string;
  countryCode?: string;
  currency?: string;
  timezone?: string;
  primaryCampus: { name: string; code: string };
}

/**
 * Runs on the platform-admin connection (PLATFORM_TRANSACTION_RUNNER), not the
 * tenant-scoped one — there is no tenant context yet at the moment a tenant is being
 * created (Architecture §6). This is one of the few legitimate uses of the bypass
 * path; everything after this use case runs is ordinary tenant-scoped traffic.
 */
@Injectable()
export class ProvisionTenantUseCase {
  constructor(
    @Inject(PLATFORM_TRANSACTION_RUNNER) private readonly txRunner: PlatformTransactionRunner,
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async execute(input: ProvisionTenantInput): Promise<{ tenantId: string }> {
    const slug = TenantSlug.create(input.slug).value;
    const tenantId = randomUUID();

    await this.txRunner.run(async (tx) => {
      if (await this.tenants.existsBySlug(slug, tx)) {
        throw new TenantSlugAlreadyExistsError(slug);
      }

      await this.tenants.create(
        {
          id: tenantId,
          name: input.name,
          legalName: input.legalName,
          slug,
          countryCode: input.countryCode ?? 'IN',
          currency: input.currency ?? 'INR',
          timezone: input.timezone ?? 'Asia/Kolkata',
          primaryCampus: input.primaryCampus,
        },
        tx,
      );

      await this.events.publish(new TenantProvisionedEvent(tenantId, slug, new Date()), tx);
    });

    return { tenantId };
  }
}
