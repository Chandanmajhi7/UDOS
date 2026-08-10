import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../../../platform/auth/jwt-payload';

const SUPER_ADMIN_ROLE = 'super-admin';

/**
 * Gates the Super Admin console (admin/tenants/*, excluded from TenancyMiddleware
 * — Architecture §6). Checks the realm role Keycloak issued directly in the token,
 * unlike ordinary tenant RBAC (UserRoleAssignment, resolved fresh from our own DB
 * on every request) — Super Admin is a small, rare, high-trust group where that
 * tradeoff (a revoked super-admin role takes effect at next token expiry, not
 * instantly) is acceptable; see infra/keycloak/setup-realm.mjs's header comment.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { authTokenPayload?: JwtPayload }>();
    const roles = request.authTokenPayload?.realm_access?.roles ?? [];
    return roles.includes(SUPER_ADMIN_ROLE);
  }
}
