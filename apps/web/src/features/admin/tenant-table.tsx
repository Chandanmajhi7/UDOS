'use client';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { TenantListItem, TenantStatus } from '../../lib/admin-api-client';
import { useUpdateTenantStatus } from './use-admin-tenants';

const STATUS_VARIANT: Record<TenantStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'outline',
  ACTIVE: 'default',
  SUSPENDED: 'secondary',
  OFFBOARDED: 'destructive',
};

// Mirrors apps/api/src/modules/tenant/domain/tenant-status-transition.ts — the backend
// is the source of truth and re-validates regardless; this only avoids offering a
// button for a transition that would just come back as a 409.
const AVAILABLE_ACTIONS: Record<TenantStatus, { label: string; target: TenantStatus }[]> = {
  PENDING: [{ label: 'Activate', target: 'ACTIVE' }],
  ACTIVE: [
    { label: 'Suspend', target: 'SUSPENDED' },
    { label: 'Offboard', target: 'OFFBOARDED' },
  ],
  SUSPENDED: [
    { label: 'Resume', target: 'ACTIVE' },
    { label: 'Offboard', target: 'OFFBOARDED' },
  ],
  OFFBOARDED: [],
};

export function TenantTable({ tenants }: { tenants: TenantListItem[] }) {
  const updateStatus = useUpdateTenantStatus();

  if (tenants.length === 0) {
    return <p className="text-sm text-muted-foreground">No tenants yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Slug</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => (
            <tr key={tenant.id} className="border-b last:border-0">
              <td className="px-4 py-2 font-medium">{tenant.name}</td>
              <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{tenant.slug}</td>
              <td className="px-4 py-2">
                <Badge variant={STATUS_VARIANT[tenant.status]}>{tenant.status}</Badge>
              </td>
              <td className="px-4 py-2">
                <div className="flex gap-2">
                  {AVAILABLE_ACTIONS[tenant.status].map((action) => (
                    <Button
                      key={action.target}
                      variant="outline"
                      size="sm"
                      disabled={updateStatus.isPending}
                      onClick={() => {
                        if (
                          action.target === 'OFFBOARDED' &&
                          !window.confirm(`Offboard ${tenant.name}? This cannot be undone.`)
                        ) {
                          return;
                        }
                        updateStatus.mutate({ id: tenant.id, status: action.target });
                      }}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
