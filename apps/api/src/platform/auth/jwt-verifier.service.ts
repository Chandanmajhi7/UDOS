import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { JwtPayload } from './jwt-payload';

/**
 * Verifies access tokens against Keycloak's published JWKS (Architecture §6) —
 * signature and expiry only. createRemoteJWKSet caches the key set and re-fetches
 * on an unrecognized `kid`, so key rotation on the Keycloak side doesn't require a
 * deploy here.
 *
 * Deliberately does not check `aud`/`azp` yet — tightening that is a documented
 * Phase 14 hardening item (see docs/phase-10-authentication.md), not silently
 * skipped. Issuer and signature are the load-bearing checks for now.
 */
@Injectable()
export class JwtVerifierService {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;

  constructor() {
    this.issuer = process.env.KEYCLOAK_ISSUER ?? 'http://localhost:8080/realms/udos';
    this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/protocol/openid-connect/certs`));
  }

  async verify(token: string): Promise<JwtPayload> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, { issuer: this.issuer });
      return payload as unknown as JwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
