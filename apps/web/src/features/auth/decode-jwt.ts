export interface DecodedAccessToken {
  sub: string;
  email?: string;
  name?: string;
  tenant_id?: string;
  realm_access?: { roles: string[] };
  exp: number;
}

/**
 * Decodes (does NOT verify) a JWT payload — purely for client-side UX ("show the
 * Admin link if this token has the super-admin role", "log out when it's expired").
 * The backend's AuthGuard is the only thing that actually verifies signatures
 * (apps/api/src/platform/auth/jwt-verifier.service.ts); trusting a client-side
 * decode for anything security-relevant would be meaningless — the browser can't
 * be trusted to decode its own token honestly in the first place.
 */
export function decodeAccessToken(token: string): DecodedAccessToken | null {
  try {
    const payloadB64 = token.split('.')[1];
    const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
}
