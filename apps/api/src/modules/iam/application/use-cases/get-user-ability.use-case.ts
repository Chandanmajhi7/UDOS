import { Inject, Injectable } from '@nestjs/common';
import { UserAbility } from '../../domain/user-ability';
import type { UserRoleAssignmentRepository } from '../ports/user-role-assignment.repository.port';
import { USER_ROLE_ASSIGNMENT_REPOSITORY } from '../ports/user-role-assignment.repository.port';

@Injectable()
export class GetUserAbilityUseCase {
  constructor(
    @Inject(USER_ROLE_ASSIGNMENT_REPOSITORY)
    private readonly assignments: UserRoleAssignmentRepository,
  ) {}

  async execute(tenantId: string, userId: string): Promise<UserAbility> {
    const scopedAssignments = await this.assignments.findForUser(tenantId, userId);
    return new UserAbility(scopedAssignments);
  }
}
