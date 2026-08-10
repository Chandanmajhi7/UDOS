import { buildAuthorizeUrl } from './oidc-config';
import { deriveCodeChallenge, generateCodeVerifier, generateState } from './pkce';

const PKCE_STASH_KEY = 'udos-pkce-pending';

export async function startLogin(returnTo = '/portal'): Promise<void> {
  const codeVerifier = generateCodeVerifier();
  const state = generateState();
  const codeChallenge = await deriveCodeChallenge(codeVerifier);

  // Round-trips through Keycloak's redirect — sessionStorage survives that, an
  // in-memory store would not.
  sessionStorage.setItem(PKCE_STASH_KEY, JSON.stringify({ codeVerifier, state, returnTo }));

  window.location.href = buildAuthorizeUrl({ codeChallenge, state });
}

export function consumePendingPkce(): { codeVerifier: string; state: string; returnTo: string } | null {
  const raw = sessionStorage.getItem(PKCE_STASH_KEY);
  sessionStorage.removeItem(PKCE_STASH_KEY);
  return raw ? JSON.parse(raw) : null;
}
