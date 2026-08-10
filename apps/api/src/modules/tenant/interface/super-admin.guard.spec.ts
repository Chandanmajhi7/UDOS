import { ExecutionContext } from '@nestjs/common';
import { SuperAdminGuard } from './super-admin.guard';

function buildContext(authTokenPayload: unknown) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ authTokenPayload }) }),
  } as unknown as ExecutionContext;
}

describe('SuperAdminGuard', () => {
  const guard = new SuperAdminGuard();

  it('allows a token carrying the super-admin realm role', () => {
    const context = buildContext({ realm_access: { roles: ['super-admin', 'offline_access'] } });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies a token without the super-admin realm role', () => {
    const context = buildContext({ realm_access: { roles: ['offline_access'] } });
    expect(guard.canActivate(context)).toBe(false);
  });

  it('denies when there is no token payload at all', () => {
    expect(guard.canActivate(buildContext(undefined))).toBe(false);
  });
});
