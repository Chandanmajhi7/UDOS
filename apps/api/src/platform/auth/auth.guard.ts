import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { JwtVerifierService } from './jwt-verifier.service';
import { JwtPayload } from './jwt-payload';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * Global, default-deny: every route requires a valid bearer token unless marked
 * @Public(). Deliberately narrow — this guard only proves "this token is real and
 * unexpired" and decodes its claims onto the request; it does NOT decide who the
 * caller is in our system (that's TenantUserGuard, tenant-scoped) or whether
 * they're a Super Admin (SuperAdminGuard, platform-scoped). Splitting those apart
 * mirrors the split between tenant-scoped and platform-scoped operations
 * elsewhere in this codebase (Architecture §6).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtVerifier: JwtVerifierService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { authTokenPayload?: JwtPayload }>();
    const token = this.extractBearerToken(request);
    if (!token) throw new UnauthorizedException('Missing bearer token');

    request.authTokenPayload = await this.jwtVerifier.verify(token);
    return true;
  }

  private extractBearerToken(request: Request): string | undefined {
    const header = request.header('Authorization');
    if (!header?.startsWith('Bearer ')) return undefined;
    return header.slice('Bearer '.length);
  }
}
