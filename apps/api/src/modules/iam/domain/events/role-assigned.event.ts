import { AbilityScope } from '../user-ability';

/**
 * Published by AssignRoleUseCase, consumed by the Audit module (Phase 6e) via the
 * outbox (Architecture §4). Not published directly by IAM's infrastructure layer —
 * IAM depends only on the DomainEventPublisher port (platform/events), never on how
 * the event is delivered.
 */
export class RoleAssignedEvent {
  readonly type = 'iam.role_assigned' as const;

  constructor(
    public readonly tenantId: string,
    public readonly userId: string,
    public readonly roleId: string,
    public readonly scope: AbilityScope,
    public readonly assignedAt: Date,
  ) {}
}
