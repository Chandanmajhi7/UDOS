import { useAuthStore } from './auth-store';

/**
 * Clears the local access/refresh tokens — every subsequent API call goes back to
 * unauthenticated (401) immediately, which is what actually matters for this app's
 * security boundary. Does NOT also end the Keycloak SSO session server-side (that
 * needs a correctly-scoped id_token_hint + registered post-logout-redirect-uri,
 * which is real setup, not just a redirect) — a future login redirect may silently
 * re-authenticate within Keycloak's own SSO session lifetime rather than
 * re-prompting for credentials. Documented gap, not a security hole: this app's
 * own access token is genuinely gone either way.
 */
export function logout(): void {
  useAuthStore.getState().clear();
  window.location.href = '/';
}
