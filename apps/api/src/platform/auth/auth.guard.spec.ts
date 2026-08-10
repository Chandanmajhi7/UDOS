import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { JwtVerifierService } from './jwt-verifier.service';

function buildContext(headers: Record<string, string | undefined>) {
  const req: { header: (name: string) => string | undefined; authTokenPayload?: unknown } = {
    header: (name: string) => headers[name],
  };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext & { __req: typeof req };
}

describe('AuthGuard', () => {
  it('allows the request through without a token when the route is @Public()', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(true) } as unknown as Reflector;
    const jwtVerifier = { verify: jest.fn() } as unknown as JwtVerifierService;
    const guard = new AuthGuard(reflector, jwtVerifier);

    await expect(guard.canActivate(buildContext({}))).resolves.toBe(true);
    expect(jwtVerifier.verify).not.toHaveBeenCalled();
  });

  it('rejects a request with no Authorization header', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) } as unknown as Reflector;
    const jwtVerifier = { verify: jest.fn() } as unknown as JwtVerifierService;
    const guard = new AuthGuard(reflector, jwtVerifier);

    await expect(guard.canActivate(buildContext({}))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a non-Bearer Authorization header', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) } as unknown as Reflector;
    const jwtVerifier = { verify: jest.fn() } as unknown as JwtVerifierService;
    const guard = new AuthGuard(reflector, jwtVerifier);

    await expect(
      guard.canActivate(buildContext({ Authorization: 'Basic abc123' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('verifies the token and attaches the payload to the request', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) } as unknown as Reflector;
    const payload = { sub: 'user-1', tenant_id: 'tenant-1' };
    const jwtVerifier = { verify: jest.fn().mockResolvedValue(payload) } as unknown as JwtVerifierService;
    const guard = new AuthGuard(reflector, jwtVerifier);
    const context = buildContext({ Authorization: 'Bearer good-token' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtVerifier.verify).toHaveBeenCalledWith('good-token');
    expect(context.switchToHttp().getRequest().authTokenPayload).toEqual(payload);
  });
});
