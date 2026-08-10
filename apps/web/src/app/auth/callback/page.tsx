'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { exchangeCodeForTokens } from '../../../features/auth/oidc-config';
import { consumePendingPkce } from '../../../features/auth/start-login';
import { useAuthStore } from '../../../features/auth/auth-store';

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setTokens = useAuthStore((state) => state.setTokens);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const oauthError = searchParams.get('error');

    if (oauthError) {
      setError(searchParams.get('error_description') ?? oauthError);
      return;
    }
    if (!code || !state) {
      setError('Missing code or state in callback URL.');
      return;
    }

    const pending = consumePendingPkce();
    if (!pending || pending.state !== state) {
      setError('State mismatch — possible CSRF, or this page was reloaded. Please log in again.');
      return;
    }

    exchangeCodeForTokens(code, pending.codeVerifier)
      .then((tokens) => {
        setTokens(tokens.access_token, tokens.refresh_token);
        router.replace(pending.returnTo);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Token exchange failed'));
  }, [searchParams, router, setTokens]);

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-sm font-medium text-destructive">Login failed</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Completing sign-in…</p>
    </main>
  );
}

export default function CallbackPage() {
  return (
    <Suspense>
      <CallbackInner />
    </Suspense>
  );
}
