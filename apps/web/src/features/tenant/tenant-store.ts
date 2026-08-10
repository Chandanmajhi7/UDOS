import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TenantSelectionState {
  tenantSlug: string | null;
  setTenantSlug: (slug: string | null) => void;
}

/**
 * Which institution's portal the browser is currently in — a stand-in for the real
 * subdomain routing this becomes once each tenant is served from its own
 * <slug>.udos.app (Architecture §5). Persisted so a page refresh doesn't drop back
 * to the tenant-selection screen. This is NOT user authentication — see Phase 10.
 */
export const useTenantSelection = create<TenantSelectionState>()(
  persist(
    (set) => ({
      tenantSlug: null,
      setTenantSlug: (tenantSlug) => set({ tenantSlug }),
    }),
    { name: 'udos-tenant-selection' },
  ),
);
