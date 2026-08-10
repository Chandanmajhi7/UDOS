'use client';

import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { startLogin } from './start-login';
import { useDecodedAccessToken, useIsSuperAdmin } from './auth-store';

/**
 * Gates a page behind a real Keycloak session — the frontend counterpart to
 * AuthGuard (backend). Not just UX polish: without a valid token, every API call
 * this page makes gets a real 401/403 from the backend regardless of what this
 * component renders, so this only controls what the user sees while that's true,
 * never what they can actually reach.
 */
export function AuthGate({
  children,
  requireSuperAdmin = false,
  returnTo,
}: {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
  returnTo: string;
}) {
  const decoded = useDecodedAccessToken();
  const isSuperAdmin = useIsSuperAdmin();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  if (!decoded) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>This page needs a real Keycloak session.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => startLogin(returnTo)}>Log in</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-sm font-medium text-destructive">Access denied</p>
        <p className="text-sm text-muted-foreground">
          Signed in as {decoded.email ?? decoded.sub}, but this account does not carry the
          super-admin role.
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
