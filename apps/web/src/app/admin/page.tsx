'use client';

import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { ThemeToggle } from '../../components/theme-toggle';
import { CreateTenantDialog } from '../../features/admin/create-tenant-dialog';
import { TenantTable } from '../../features/admin/tenant-table';
import { useAdminTenants, useTenantAnalytics } from '../../features/admin/use-admin-tenants';
import { StatTile } from '../../features/admin/stat-tile';
import { StatusBreakdownChart } from '../../features/admin/status-breakdown-chart';
import { GrowthChart } from '../../features/admin/growth-chart';
import { AuthGate } from '../../features/auth/auth-gate';
import { useDecodedAccessToken } from '../../features/auth/auth-store';
import { logout } from '../../features/auth/logout';

function AdminContent() {
  const { data: tenants, isPending, isError } = useAdminTenants();
  const { data: analytics } = useTenantAnalytics();
  const decoded = useDecodedAccessToken();

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Super Admin console</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {decoded?.email ?? decoded?.sub} (super-admin role verified server-side
            on every request).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={logout}>
            Log out
          </Button>
          <ThemeToggle />
        </div>
      </div>

      {analytics && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile label="Total tenants" value={analytics.totalTenants} />
            <StatTile label="Active" value={analytics.byStatus.ACTIVE} />
            <StatTile label="Pending" value={analytics.byStatus.PENDING} />
            <StatTile label="Suspended" value={analytics.byStatus.SUSPENDED} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tenants by status</CardTitle>
                <CardDescription>Every tenant, grouped by lifecycle state.</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusBreakdownChart byStatus={analytics.byStatus} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cumulative tenants provisioned</CardTitle>
                <CardDescription>Running total by day.</CardDescription>
              </CardHeader>
              <CardContent>
                <GrowthChart growth={analytics.growth} />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Tenants</CardTitle>
            <CardDescription>Fetched live from GET /api/admin/tenants.</CardDescription>
          </div>
          <CreateTenantDialog />
        </CardHeader>
        <CardContent>
          {isPending && <p className="text-sm text-muted-foreground">Loading tenants…</p>}
          {isError && <p className="text-sm text-destructive">Could not reach the backend.</p>}
          {tenants && <TenantTable tenants={tenants} />}
        </CardContent>
      </Card>
    </main>
  );
}

export default function AdminPage() {
  return (
    <AuthGate requireSuperAdmin returnTo="/admin">
      <AdminContent />
    </AuthGate>
  );
}
