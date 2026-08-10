'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ThemeToggle } from '../../components/theme-toggle';
import { useTenantSelection } from '../../features/tenant/tenant-store';
import { useCurrentTenant } from '../../features/tenant/use-current-tenant';
import { ApiError } from '../../lib/api-client';
import { AuthGate } from '../../features/auth/auth-gate';
import { useDecodedAccessToken } from '../../features/auth/auth-store';
import { logout } from '../../features/auth/logout';

function PortalContent() {
  const router = useRouter();
  const tenantSlug = useTenantSelection((state) => state.tenantSlug);
  const setTenantSlug = useTenantSelection((state) => state.setTenantSlug);
  const { data: tenant, isPending, isError, error } = useCurrentTenant(tenantSlug);
  const decoded = useDecodedAccessToken();

  useEffect(() => {
    if (!tenantSlug) router.replace('/');
  }, [tenantSlug, router]);

  if (!tenantSlug) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Portal</CardTitle>
          <CardDescription>
            Signed in as {decoded?.email ?? decoded?.sub}. This card is fetched live from the
            real backend at <code>GET /api/tenant/me</code>, with a real bearer token attached —
            not sample data.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isPending && <p className="text-sm text-muted-foreground">Loading tenant…</p>}

          {isError && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-destructive">
                {error instanceof ApiError
                  ? `${error.status}: ${error.message}`
                  : 'Could not reach the backend.'}
              </p>
              <p className="text-xs text-muted-foreground">
                Is the API running, and does the logged-in user&apos;s tenant_id claim match this
                institution?
              </p>
            </div>
          )}

          {tenant && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{tenant.name}</dd>
              <dt className="text-muted-foreground">Slug</dt>
              <dd className="font-mono">{tenant.slug}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium">{tenant.status}</dd>
            </dl>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setTenantSlug(null);
                router.push('/');
              }}
            >
              Switch institution
            </Button>
            <Button variant="ghost" onClick={logout}>
              Log out
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function PortalPage() {
  return (
    <AuthGate returnTo="/portal">
      <PortalContent />
    </AuthGate>
  );
}
