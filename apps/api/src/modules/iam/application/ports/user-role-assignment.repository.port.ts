import { Prisma } from '@udos/database';
import { AbilityScope, ScopedRoleAssignment } from '../../domain/user-ability';

export const USER_ROLE_ASSIGNMENT_REPOSITORY = Symbol('USER_ROLE_ASSIGNMENT_REPOSITORY');

export interface UserRoleAssignmentRepository {
  findForUser(tenantId: string, userId: string): Promise<ScopedRoleAssignment[]>;

  assign(
    tenantId: string,
    userId: string,
    roleId: string,
    scope: AbilityScope,
    tx: Prisma.TransactionClient,
  ): Promise<void>;
}
