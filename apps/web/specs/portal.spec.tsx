import React from 'react';
import { render, screen } from '@testing-library/react';
import PortalPage from '../src/app/portal/page';
import { useTenantSelection } from '../src/features/tenant/tenant-store';
import { useCurrentTenant } from '../src/features/tenant/use-current-tenant';
import { useAuthStore } from '../src/features/auth/auth-store';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('../src/features/tenant/use-current-tenant');

function fakeAccessToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fake-signature`;
}

describe('PortalPage', () => {
  beforeEach(() => {
    useTenantSelection.setState({ tenantSlug: 'acme-college' });
    // AuthGate (Phase 10) requires a valid, unexpired token before it renders the
    // page's real content — matching what the backend's AuthGuard actually enforces.
    useAuthStore.setState({
      accessToken: fakeAccessToken({
        sub: 'user-1',
        email: 'a@b.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
      refreshToken: 'fake-refresh-token',
    });
  });

  it('renders the tenant fetched from the backend', () => {
    (useCurrentTenant as jest.Mock).mockReturnValue({
      data: { id: 't1', slug: 'acme-college', name: 'Acme College', status: 'ACTIVE' },
      isPending: false,
      isError: false,
      error: null,
    });

    render(<PortalPage />);

    expect(screen.getByText('Acme College')).toBeTruthy();
    expect(screen.getByText('acme-college')).toBeTruthy();
    expect(screen.getByText('ACTIVE')).toBeTruthy();
  });

  it('surfaces a backend error instead of failing silently', () => {
    (useCurrentTenant as jest.Mock).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('boom'),
    });

    render(<PortalPage />);

    expect(screen.getByText(/Could not reach the backend/)).toBeTruthy();
  });

  it('shows a login prompt instead of the portal when not authenticated', () => {
    useAuthStore.setState({ accessToken: null, refreshToken: null });
    (useCurrentTenant as jest.Mock).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
    });

    render(<PortalPage />);

    expect(screen.getByText('Sign in required')).toBeTruthy();
    expect(screen.queryByText('Portal')).toBeNull();
  });
});
