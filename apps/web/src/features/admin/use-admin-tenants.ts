import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApiClient, CreateTenantInput, TenantStatus } from '../../lib/admin-api-client';

const TENANTS_QUERY_KEY = ['admin', 'tenants'];
const ANALYTICS_QUERY_KEY = ['admin', 'tenants', 'analytics'];

export function useAdminTenants() {
  return useQuery({
    queryKey: TENANTS_QUERY_KEY,
    queryFn: adminApiClient.listTenants,
  });
}

export function useTenantAnalytics() {
  return useQuery({
    queryKey: ANALYTICS_QUERY_KEY,
    queryFn: adminApiClient.getAnalytics,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTenantInput) => adminApiClient.createTenant(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TENANTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
    },
  });
}

export function useUpdateTenantStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TenantStatus }) =>
      adminApiClient.updateTenantStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TENANTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
    },
  });
}
