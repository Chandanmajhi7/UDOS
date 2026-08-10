export type TenantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'OFFBOARDED';

export class InvalidTenantStatusTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot transition tenant status from ${from} to ${to}`);
    this.name = 'InvalidTenantStatusTransitionError';
  }
}

/**
 * PRD §6.1's tenant lifecycle (provision, suspend, resume, offboard) as an explicit
 * graph, not a free-form status field — OFFBOARDED is terminal (no reactivating an
 * offboarded tenant through this action; that's a distinct, deliberate re-provisioning
 * decision, not a status flip), and PENDING only ever moves forward to ACTIVE.
 */
const ALLOWED_TRANSITIONS: Record<TenantStatus, TenantStatus[]> = {
  PENDING: ['ACTIVE'],
  ACTIVE: ['SUSPENDED', 'OFFBOARDED'],
  SUSPENDED: ['ACTIVE', 'OFFBOARDED'],
  OFFBOARDED: [],
};

export function assertValidTenantStatusTransition(from: TenantStatus, to: TenantStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new InvalidTenantStatusTransitionError(from, to);
  }
}
