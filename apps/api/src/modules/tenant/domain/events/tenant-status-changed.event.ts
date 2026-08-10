/** Published by UpdateTenantStatusUseCase. Consumed by the Audit module. */
export class TenantStatusChangedEvent {
  readonly type = 'tenant.status_changed' as const;

  constructor(
    public readonly tenantId: string,
    public readonly fromStatus: string,
    public readonly toStatus: string,
    public readonly changedAt: Date,
  ) {}
}
