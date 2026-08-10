export class TenantNotFoundError extends Error {
  constructor(tenantId: string) {
    super(`No tenant found with id "${tenantId}"`);
    this.name = 'TenantNotFoundError';
  }
}
