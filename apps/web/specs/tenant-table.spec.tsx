import React from 'react';
import { render, screen } from '@testing-library/react';
import { TenantTable } from '../src/features/admin/tenant-table';
import { useUpdateTenantStatus } from '../src/features/admin/use-admin-tenants';
import { TenantListItem } from '../src/lib/admin-api-client';

jest.mock('../src/features/admin/use-admin-tenants');

describe('TenantTable', () => {
  beforeEach(() => {
    (useUpdateTenantStatus as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false });
  });

  it('renders an empty state with no tenants', () => {
    render(<TenantTable tenants={[]} />);
    expect(screen.getByText('No tenants yet.')).toBeTruthy();
  });

  it('shows the right actions for each tenant status', () => {
    const tenants: TenantListItem[] = [
      { id: '1', slug: 'pending-co', name: 'Pending Co', status: 'PENDING' },
      { id: '2', slug: 'active-co', name: 'Active Co', status: 'ACTIVE' },
      { id: '3', slug: 'offboarded-co', name: 'Offboarded Co', status: 'OFFBOARDED' },
    ];

    render(<TenantTable tenants={tenants} />);

    expect(screen.getByText('Activate')).toBeTruthy();
    expect(screen.getByText('Suspend')).toBeTruthy();
    expect(screen.getAllByText('Offboard')).toHaveLength(1); // only ACTIVE row offers it
    expect(screen.getByText('PENDING')).toBeTruthy();
    expect(screen.getByText('ACTIVE')).toBeTruthy();
    expect(screen.getByText('OFFBOARDED')).toBeTruthy();
  });
});
