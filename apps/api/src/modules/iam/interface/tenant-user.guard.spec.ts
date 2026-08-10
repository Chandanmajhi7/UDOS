import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantUserGuard } from './tenant-user.guard';
import { ResolveOrProvisionUserUseCase } from '../application/use-cases/resolve-or-provision-user.use-case';

function buildContext(req: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('TenantUserGuard', () => {
  it('throws when the token or tenant context is missing (programming error)', async () => {
    const resolveOrProvisionUser = { execute: jest.fn() } as unknown as ResolveOrProvisionUserUseCase;
    const guard = new TenantUserGuard(resolveOrProvisionUser);

    await expect(
      guard.canActivate(buildContext({ authTokenPayload: undefined, tenant: { id: 't1' } })),
    ).rejects.toThrow(ForbiddenException);
  });

  it("rejects when the token's tenant_id does not match the resolved tenant", async () => {
    const resolveOrProvisionUser = { execute: jest.fn() } as unknown as ResolveOrProvisionUserUseCase;
    const guard = new TenantUserGuard(resolveOrProvisionUser);
    const req = {
      authTokenPayload: { sub: 'kc-1', tenant_id: 'tenant-A' },
      tenant: { id: 'tenant-B', slug: 'b', name: 'B', status: 'ACTIVE' },
    };

    await expect(guard.canActivate(buildContext(req))).rejects.toThrow(ForbiddenException);
    expect(resolveOrProvisionUser.execute).not.toHaveBeenCalled();
  });

  it('resolves the user and attaches req.user when tenant_id matches', async () => {
    const resolveOrProvisionUser = {
      execute: jest.fn().mockResolvedValue({ id: 'user-1', tenantId: 'tenant-A' }),
    } as unknown as ResolveOrProvisionUserUseCase;
    const guard = new TenantUserGuard(resolveOrProvisionUser);
    const req: Record<string, unknown> = {
      authTokenPayload: { sub: 'kc-1', tenant_id: 'tenant-A', email: 'a@b.com', name: 'A B' },
      tenant: { id: 'tenant-A', slug: 'a', name: 'A', status: 'ACTIVE' },
    };

    const result = await guard.canActivate(buildContext(req));

    expect(result).toBe(true);
    expect(resolveOrProvisionUser.execute).toHaveBeenCalledWith({
      keycloakSubjectId: 'kc-1',
      tenantId: 'tenant-A',
      email: 'a@b.com',
      fullName: 'A B',
    });
    expect(req.user).toEqual({ id: 'user-1', tenantId: 'tenant-A' });
  });
});
