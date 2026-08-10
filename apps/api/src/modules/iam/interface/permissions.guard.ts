import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RequestUser } from '../../../platform/auth/request-user';
import { GetUserAbilityUseCase } from '../application/use-cases/get-user-ability.use-case';
import { REQUIRE_PERMISSION_KEY } from './require-permission.decorator';

/**
 * RBAC gate (Architecture §6) — "does this role reach this route at all". Data-level
 * ABAC scoping (which records within the route) is applied by each module's own
 * repository queries using the same UserAbility, not by this guard.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly getUserAbility: GetUserAbilityUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string | undefined>(
      REQUIRE_PERMISSION_KEY,
      context.getHandler(),
    );
    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const user = request.user;
    if (!user) return false;

    const ability = await this.getUserAbility.execute(user.tenantId, user.id);
    return ability.can(requiredPermission);
  }
}
