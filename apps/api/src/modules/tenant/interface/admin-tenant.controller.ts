import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProvisionTenantUseCase } from '../application/use-cases/provision-tenant.use-case';
import { ListTenantsUseCase } from '../application/use-cases/list-tenants.use-case';
import { UpdateTenantStatusUseCase } from '../application/use-cases/update-tenant-status.use-case';
import { GetTenantAnalyticsUseCase } from '../application/use-cases/get-tenant-analytics.use-case';
import { TenantSlugAlreadyExistsError } from '../domain/tenant-slug-already-exists.error';
import { TenantNotFoundError } from '../domain/tenant-not-found.error';
import { InvalidTenantStatusTransitionError } from '../domain/tenant-status-transition';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';
import { SuperAdminGuard } from './super-admin.guard';

/**
 * Super Admin console surface (PRD §6.1, Phase 8). Deliberately NOT under
 * TenancyMiddleware (see AppModule) — these operations act across tenants or before
 * a tenant exists at all, same as the use cases behind them (Architecture §6).
 *
 * Gated by SuperAdminGuard (Phase 10) on top of the global AuthGuard: a valid
 * token alone is not enough here, it must carry the super-admin realm role.
 */
@Controller('admin/tenants')
@UseGuards(SuperAdminGuard)
export class AdminTenantController {
  constructor(
    private readonly provisionTenant: ProvisionTenantUseCase,
    private readonly listTenants: ListTenantsUseCase,
    private readonly updateTenantStatus: UpdateTenantStatusUseCase,
    private readonly getTenantAnalytics: GetTenantAnalyticsUseCase,
  ) {}

  @Get()
  list() {
    return this.listTenants.execute();
  }

  @Get('analytics')
  analytics() {
    return this.getTenantAnalytics.execute();
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateTenantDto) {
    try {
      return await this.provisionTenant.execute(dto);
    } catch (err) {
      if (err instanceof TenantSlugAlreadyExistsError) {
        throw new ConflictException(err.message);
      }
      throw err;
    }
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateTenantStatusDto) {
    try {
      await this.updateTenantStatus.execute({ tenantId: id, status: dto.status });
      return { id, status: dto.status };
    } catch (err) {
      if (err instanceof TenantNotFoundError) throw new NotFoundException(err.message);
      if (err instanceof InvalidTenantStatusTransitionError) throw new ConflictException(err.message);
      throw err;
    }
  }
}
