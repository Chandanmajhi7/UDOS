import { ApiError } from './api-client';
import { useAuthStore } from '../features/auth/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export type TenantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'OFFBOARDED';

export interface TenantListItem {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
}

export interface CreateTenantInput {
  name: string;
  legalName: string;
  slug: string;
  primaryCampus: { name: string; code: string };
}

export interface TenantAnalytics {
  totalTenants: number;
  byStatus: Record<TenantStatus, number>;
  growth: { date: string; cumulativeCount: number }[];
}

/**
 * Unlike lib/api-client.ts, these calls carry no X-Tenant-Slug header — the
 * admin/tenants routes are platform-level, not tenant-scoped (Phase 8, excluded
 * from TenancyMiddleware in apps/api/src/app/app.module.ts). They still require a
 * bearer token carrying the super-admin realm role (SuperAdminGuard, Phase 10).
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new ApiError(res.status, message ?? 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const adminApiClient = {
  listTenants: () => request<TenantListItem[]>('/admin/tenants'),

  createTenant: (input: CreateTenantInput) =>
    request<{ tenantId: string }>('/admin/tenants', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateTenantStatus: (id: string, status: TenantStatus) =>
    request<{ id: string; status: TenantStatus }>(`/admin/tenants/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getAnalytics: () => request<TenantAnalytics>('/admin/tenants/analytics'),
};
