import { Inject, Injectable } from '@nestjs/common';
import { computeTenantAnalytics, TenantAnalytics } from '../../domain/tenant-analytics';
import type { TenantStatus } from '../../domain/tenant-status-transition';
import type { TenantRepository } from '../ports/tenant.repository.port';
import { TENANT_REPOSITORY } from '../ports/tenant.repository.port';

@Injectable()
export class GetTenantAnalyticsUseCase {
  constructor(@Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository) {}

  async execute(): Promise<TenantAnalytics> {
    const all = await this.tenants.findAll();
    return computeTenantAnalytics(
      all.map((t) => ({ status: t.status as TenantStatus, createdAt: t.createdAt })),
    );
  }
}
