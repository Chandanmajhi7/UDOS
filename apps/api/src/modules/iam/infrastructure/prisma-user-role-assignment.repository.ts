import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@udos/database';
import { Permission } from '../domain/permission.vo';
import { Role } from '../domain/role.entity';
import { AbilityScope, ScopedRoleAssignment } from '../domain/user-ability';
import { UserRoleAssignmentRepository } from '../application/ports/user-role-assignment.repository.port';

type AssignmentWithRole = Prisma.UserRoleAssignmentGetPayload<{
  include: { role: { include: { permissions: { include: { permission: true } } } } };
}>;

@Injectable()
export class PrismaUserRoleAssignmentRepository implements UserRoleAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findForUser(tenantId: string, userId: string): Promise<ScopedRoleAssignment[]> {
    return this.prisma.withTenantContext(tenantId, async (tx) => {
      const rows = await tx.userRoleAssignment.findMany({
        where: { userId },
        include: { role: { include: { permissions: { include: { permission: true } } } } },
      });
      return rows.map((row) => this.toDomain(row));
    });
  }

  async assign(
    tenantId: string,
    userId: string,
    roleId: string,
    scope: AbilityScope,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.userRoleAssignment.create({
      data: {
        tenantId,
        userId,
        roleId,
        campusId: scope.campusId,
        departmentId: scope.departmentId,
      },
    });
  }

  private toDomain(row: AssignmentWithRole): ScopedRoleAssignment {
    const permissions = row.role.permissions.map((rp) => new Permission(rp.permission.code));
    const role = new Role(row.role.id, row.role.name, permissions);
    const scope: AbilityScope = {
      campusId: row.campusId ?? undefined,
      departmentId: row.departmentId ?? undefined,
    };
    return new ScopedRoleAssignment(role, scope);
  }
}
