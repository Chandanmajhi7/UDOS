import { Role } from './role.entity';

export interface AbilityScope {
  campusId?: string;
  departmentId?: string;
}

/**
 * One of a user's role assignments, carrying the ABAC scope it was granted at
 * (Architecture §6 — a HOD's role is scoped to one department, a Principal's to
 * one campus; an unscoped assignment applies tenant-wide).
 */
export class ScopedRoleAssignment {
  constructor(
    public readonly role: Role,
    public readonly scope: AbilityScope = {},
  ) {}

  private matchesScope(required?: AbilityScope): boolean {
    const isUnscoped = !this.scope.campusId && !this.scope.departmentId;
    // An unscoped assignment (tenant-wide) satisfies any request, including one
    // that asks for no particular scope at all.
    if (isUnscoped) return true;
    // A scoped assignment only satisfies a request that names a matching scope —
    // an unscoped request ("do you have this tenant-wide?") must NOT be granted
    // by a role that was only ever assigned for one department/campus.
    if (!required) return false;
    if (this.scope.campusId && this.scope.campusId !== required.campusId) return false;
    if (this.scope.departmentId && this.scope.departmentId !== required.departmentId) return false;
    return true;
  }

  can(permissionCode: string, required?: AbilityScope): boolean {
    return this.role.can(permissionCode) && this.matchesScope(required);
  }
}

/**
 * A user's full set of role assignments within one tenant, resolved by
 * GetUserAbilityUseCase. This is the RBAC+ABAC decision point every guard and
 * repository query ultimately calls into (Architecture §6).
 */
export class UserAbility {
  constructor(private readonly assignments: readonly ScopedRoleAssignment[]) {}

  can(permissionCode: string, scope?: AbilityScope): boolean {
    return this.assignments.some((assignment) => assignment.can(permissionCode, scope));
  }
}
