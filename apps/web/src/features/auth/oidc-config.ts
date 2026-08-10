export const OIDC_ISSUER = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER ?? 'http://localhost:8080/realms/udos';
export const OIDC_CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? 'udos-web';

function redirectUri(): string {
  return `${window.location.origin}/auth/callback`;
}

export function authorizationEndpoint(): string {
  return `${OIDC_ISSUER}/protocol/openid-connect/auth`;
}

export function tokenEndpoint(): string {
  return `${OIDC_ISSUER}/protocol/openid-connect/token`;
}

export function buildAuthorizeUrl(params: { codeChallenge: string; state: string }): string {
  const url = new URL(authorizationEndpoint());
  url.searchParams.set('client_id', OIDC_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid profile email udos-tenant');
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', params.state);
  return url.toString();
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<TokenResponse> {
  const res = await fetch(tokenEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: OIDC_CLIENT_ID,
      redirect_uri: redirectUri(),
      code,
      code_verifier: codeVerifier,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}
