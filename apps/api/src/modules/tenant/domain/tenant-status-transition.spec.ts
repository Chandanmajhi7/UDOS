import {
  assertValidTenantStatusTransition,
  InvalidTenantStatusTransitionError,
} from './tenant-status-transition';

describe('assertValidTenantStatusTransition', () => {
  it.each([
    ['PENDING', 'ACTIVE'],
    ['ACTIVE', 'SUSPENDED'],
    ['ACTIVE', 'OFFBOARDED'],
    ['SUSPENDED', 'ACTIVE'],
    ['SUSPENDED', 'OFFBOARDED'],
  ] as const)('allows %s -> %s', (from, to) => {
    expect(() => assertValidTenantStatusTransition(from, to)).not.toThrow();
  });

  it.each([
    ['PENDING', 'SUSPENDED'],
    ['PENDING', 'OFFBOARDED'],
    ['OFFBOARDED', 'ACTIVE'],
    ['OFFBOARDED', 'SUSPENDED'],
    ['ACTIVE', 'PENDING'],
  ] as const)('rejects %s -> %s', (from, to) => {
    expect(() => assertValidTenantStatusTransition(from, to)).toThrow(
      InvalidTenantStatusTransitionError,
    );
  });
});
