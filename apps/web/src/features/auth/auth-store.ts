import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { decodeAccessToken, DecodedAccessToken } from './decode-jwt';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clear: () => void;
}

/**
 * sessionStorage, not localStorage: the access token lives only as long as the
 * tab. This is a known, accepted tradeoff for Wave 0 — storing a bearer token in
 * any browser-JS-readable storage carries some XSS exposure; a hardened BFF-proxy
 * pattern (tokens never leave an httpOnly cookie, Next.js route handlers attach
 * them server-side) is a documented Phase 14 hardening item, not silently skipped.
 * See docs/phase-10-authentication.md §4.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      clear: () => set({ accessToken: null, refreshToken: null }),
    }),
    {
      name: 'udos-auth',
      storage: {
        getItem: (name) => {
          const value = sessionStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => sessionStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => sessionStorage.removeItem(name),
      },
    },
  ),
);

export function useDecodedAccessToken(): DecodedAccessToken | null {
  const token = useAuthStore((state) => state.accessToken);
  if (!token) return null;
  const decoded = decodeAccessToken(token);
  if (!decoded) return null;
  if (decoded.exp * 1000 < Date.now()) return null;
  return decoded;
}

export function useIsSuperAdmin(): boolean {
  const decoded = useDecodedAccessToken();
  return decoded?.realm_access?.roles.includes('super-admin') ?? false;
}
