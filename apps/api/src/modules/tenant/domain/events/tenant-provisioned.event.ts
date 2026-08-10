/** Published by ProvisionTenantUseCase. Consumed by the Audit module (Phase 6e). */
export class TenantProvisionedEvent {
  readonly type = 'tenant.provisioned' as const;

  constructor(
    public readonly tenantId: string,
    public readonly slug: string,
    public readonly provisionedAt: Date,
  ) {}
}
