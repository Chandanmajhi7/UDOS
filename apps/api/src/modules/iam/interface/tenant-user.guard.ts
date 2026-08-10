import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../../../platform/auth/jwt-payload';
import { RequestUser } from '../../../platform/auth/request-user';
import { TenantContext } from '../../../platform/tenancy/tenant-context';
import { ResolveOrProvisionUserUseCase } from '../application/use-cases/resolve-or-provision-user.use-case';

type AuthedTenantRequest = Request & {
  authTokenPayload?: JwtPayload;
  tenant?: TenantContext;
  user?: RequestUser;
};

/**
 * Runs on tenant-scoped routes, after TenancyMiddleware (resolves req.tenant) and
 * AuthGuard (resolves req.authTokenPayload). Cross-checks the token's tenant_id
 * claim against the subdomain-resolved tenant — System Design §4's "mismatch ...
 * -> 401, not silently corrected" — then resolves/JIT-provisions the local User
 * row and populates req.user for PermissionsGuard and everything downstream.
 */
@Injectable()
export class TenantUserGuard implements CanActivate {
  constructor(private readonly resolveOrProvisionUser: ResolveOrProvisionUserUseCase) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedTenantRequest>();
    const payload = request.authTokenPayload;
    const tenant = request.tenant;

    if (!payload || !tenant) {
      // Programming error, not a client error — AuthGuard/TenancyMiddleware must
      // run before this guard on any route that uses it.
      throw new ForbiddenException('Tenant or token context missing');
    }
    if (payload.tenant_id !== tenant.id) {
      throw new ForbiddenException("Token's tenant does not match the resolved tenant");
    }

    const user = await this.resolveOrProvisionUser.execute({
      keycloakSubjectId: payload.sub,
      tenantId: tenant.id,
      email: payload.email ?? '',
      fullName: payload.name ?? payload.email ?? payload.sub,
    });

    request.user = { id: user.id, tenantId: tenant.id };
    return true;
  }
}
