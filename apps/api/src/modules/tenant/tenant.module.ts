import { Module } from '@nestjs/common';
import { PrismaTenantRepository } from './infrastructure/prisma-tenant.repository';
import { TENANT_REPOSITORY } from './application/ports/tenant.repository.port';
import { ProvisionTenantUseCase } from './application/use-cases/provision-tenant.use-case';
import { ListTenantsUseCase } from './application/use-cases/list-tenants.use-case';
import { UpdateTenantStatusUseCase } from './application/use-cases/update-tenant-status.use-case';
import { GetTenantAnalyticsUseCase } from './application/use-cases/get-tenant-analytics.use-case';
import { TenantController } from './interface/tenant.controller';
import { AdminTenantController } from './interface/admin-tenant.controller';
import { IamModule } from '../iam/iam.module';

@Module({
  imports: [IamModule], // for TenantUserGuard (TenantController) — SuperAdminGuard has no deps
  controllers: [TenantController, AdminTenantController],
  providers: [
    { provide: TENANT_REPOSITORY, useClass: PrismaTenantRepository },
    ProvisionTenantUseCase,
    ListTenantsUseCase,
    UpdateTenantStatusUseCase,
    GetTenantAnalyticsUseCase,
  ],
  exports: [ProvisionTenantUseCase, TENANT_REPOSITORY],
})
export class TenantModule {}
