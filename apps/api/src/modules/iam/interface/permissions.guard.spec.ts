import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserAbility } from '../domain/user-ability';
import { GetUserAbilityUseCase } from '../application/use-cases/get-user-ability.use-case';
import { PermissionsGuard } from './permissions.guard';

function buildContext(user: unknown): ExecutionContext {
  return {
    getHandler: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  it('allows the request through when the route requires no permission', async () => {
    const reflector = { get: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const getUserAbility = { execute: jest.fn() } as unknown as GetUserAbilityUseCase;
    const guard = new PermissionsGuard(reflector, getUserAbility);

    await expect(guard.canActivate(buildContext(undefined))).resolves.toBe(true);
    expect(getUserAbility.execute).not.toHaveBeenCalled();
  });

  it('denies the request when a permission is required but there is no authenticated user', async () => {
    const reflector = {
      get: jest.fn().mockReturnValue('attendance:read'),
    } as unknown as Reflector;
    const getUserAbility = { execute: jest.fn() } as unknown as GetUserAbilityUseCase;
    const guard = new PermissionsGuard(reflector, getUserAbility);

    await expect(guard.canActivate(buildContext(undefined))).resolves.toBe(false);
  });

  it("grants access when the resolved ability includes the required permission", async () => {
    const reflector = {
      get: jest.fn().mockReturnValue('attendance:read'),
    } as unknown as Reflector;
    const ability = new UserAbility([]);
    jest.spyOn(ability, 'can').mockReturnValue(true);
    const getUserAbility = {
      execute: jest.fn().mockResolvedValue(ability),
    } as unknown as GetUserAbilityUseCase;
    const guard = new PermissionsGuard(reflector, getUserAbility);

    const result = await guard.canActivate(
      buildContext({ id: 'user-1', tenantId: 'tenant-1' }),
    );

    expect(result).toBe(true);
    expect(getUserAbility.execute).toHaveBeenCalledWith('tenant-1', 'user-1');
  });

  it('denies access when the resolved ability does not include the required permission', async () => {
    const reflector = { get: jest.fn().mockReturnValue('fee:waive') } as unknown as Reflector;
    const ability = new UserAbility([]);
    const getUserAbility = {
      execute: jest.fn().mockResolvedValue(ability),
    } as unknown as GetUserAbilityUseCase;
    const guard = new PermissionsGuard(reflector, getUserAbility);

    const result = await guard.canActivate(
      buildContext({ id: 'user-1', tenantId: 'tenant-1' }),
    );

    expect(result).toBe(false);
  });
});
