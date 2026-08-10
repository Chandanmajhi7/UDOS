import { Inject, Injectable } from '@nestjs/common';
import type { DomainEventPublisher } from '../../../../platform/events/domain-event-publisher.port';
import { DOMAIN_EVENT_PUBLISHER } from '../../../../platform/events/domain-event-publisher.port';
import type { TransactionRunner } from '../../../../platform/persistence/transaction-runner.port';
import { TRANSACTION_RUNNER } from '../../../../platform/persistence/transaction-runner.port';
import { AbilityScope } from '../../domain/user-ability';
import { RoleAssignedEvent } from '../../domain/events/role-assigned.event';
import type { UserRoleAssignmentRepository } from '../ports/user-role-assignment.repository.port';
import { USER_ROLE_ASSIGNMENT_REPOSITORY } from '../ports/user-role-assignment.repository.port';

export interface AssignRoleInput {
  tenantId: string;
  userId: string;
  roleId: string;
  scope?: AbilityScope;
}

@Injectable()
export class AssignRoleUseCase {
  constructor(
    @Inject(TRANSACTION_RUNNER) private readonly txRunner: TransactionRunner,
    @Inject(USER_ROLE_ASSIGNMENT_REPOSITORY)
    private readonly assignments: UserRoleAssignmentRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async execute(input: AssignRoleInput): Promise<void> {
    const scope = input.scope ?? {};

    await this.txRunner.run(input.tenantId, async (tx) => {
      await this.assignments.assign(input.tenantId, input.userId, input.roleId, scope, tx);
      await this.events.publish(
        new RoleAssignedEvent(input.tenantId, input.userId, input.roleId, scope, new Date()),
        tx,
      );
    });
  }
}
