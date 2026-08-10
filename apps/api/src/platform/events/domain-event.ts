/** Minimal shape every domain event must satisfy to go through the outbox (Architecture §4). */
export interface DomainEvent {
  readonly type: string;
  readonly tenantId: string;
}
