import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';

export function useCurrentTenant(tenantSlug: string | null) {
  return useQuery({
    queryKey: ['tenant', 'me', tenantSlug],
    queryFn: () => apiClient.getCurrentTenant(tenantSlug as string),
    enabled: Boolean(tenantSlug),
    retry: false,
  });
}
