import React from 'react';
import { render, screen } from '@testing-library/react';
import Page from '../src/app/page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

describe('TenantSelectPage', () => {
  it('renders the institution-identifier form', () => {
    render(<Page />);

    expect(screen.getByText('Go to your institution')).toBeTruthy();
    expect(screen.getByLabelText('Institution identifier')).toBeTruthy();
  });
});
