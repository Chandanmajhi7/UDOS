import { Inject, Injectable } from '@nestjs/common';
import type { TenantRepository, TenantSummary } from '../ports/tenant.repository.port';
import { TENANT_REPOSITORY } from '../ports/tenant.repository.port';

/** Super Admin console only — every other caller works within one already-resolved tenant. */
@Injectable()
export class ListTenantsUseCase {
  constructor(@Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository) {}

  execute(): Promise<TenantSummary[]> {
    return this.tenants.findAll();
  }
}
