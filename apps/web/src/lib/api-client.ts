import { useAuthStore } from '../features/auth/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface TenantMe {
  id: string;
  slug: string;
  name: string;
  status: string;
}

/**
 * X-Tenant-Slug is the local-dev tenant-resolution override the backend's
 * TenancyMiddleware accepts (apps/api/src/platform/tenancy/tenancy.middleware.ts) —
 * production resolves the tenant from the real subdomain instead, so this header
 * goes away once the app is served from <tenant>.udos.app rather than localhost.
 * The Authorization header (Phase 10) is what's actually load-bearing for auth;
 * the backend cross-checks its tenant_id claim against the tenant this header
 * resolves to and rejects a mismatch (TenantUserGuard).
 */
async function request<T>(path: string, tenantSlug: string): Promise<T> {
  const accessToken = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = { 'X-Tenant-Slug': tenantSlug };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? 'Request failed');
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  getCurrentTenant: (tenantSlug: string) => request<TenantMe>('/tenant/me', tenantSlug),
};
