import { Controller, Get, NotFoundException, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { TenantContext } from '../../../platform/tenancy/tenant-context';
import { TenantUserGuard } from '../../iam/interface/tenant-user.guard';

/**
 * Wave 0's one REST surface for the frontend to actually call before Wave 1's
 * business endpoints (openapi.yaml) exist. req.tenant is set by TenancyMiddleware
 * (Architecture §5); AuthGuard (global) + TenantUserGuard (here) resolve and
 * cross-check the caller before this handler ever runs — there is deliberately no
 * separate lookup here.
 */
@Controller('tenant')
@UseGuards(TenantUserGuard)
export class TenantController {
  @Get('me')
  getCurrentTenant(@Req() req: Request & { tenant?: TenantContext }): TenantContext {
    if (!req.tenant) {
      // Unreachable in practice — TenancyMiddleware already rejects the request
      // before it gets here — but the type is optional, so the handler stays honest.
      throw new NotFoundException('No tenant resolved for this request');
    }
    return req.tenant;
  }
}
