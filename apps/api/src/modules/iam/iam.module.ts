import { Module } from '@nestjs/common';
import { PrismaUserRoleAssignmentRepository } from './infrastructure/prisma-user-role-assignment.repository';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { USER_ROLE_ASSIGNMENT_REPOSITORY } from './application/ports/user-role-assignment.repository.port';
import { USER_REPOSITORY } from './application/ports/user.repository.port';
import { GetUserAbilityUseCase } from './application/use-cases/get-user-ability.use-case';
import { AssignRoleUseCase } from './application/use-cases/assign-role.use-case';
import { ResolveOrProvisionUserUseCase } from './application/use-cases/resolve-or-provision-user.use-case';
import { PermissionsGuard } from './interface/permissions.guard';
import { TenantUserGuard } from './interface/tenant-user.guard';

@Module({
  providers: [
    {
      provide: USER_ROLE_ASSIGNMENT_REPOSITORY,
      useClass: PrismaUserRoleAssignmentRepository,
    },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    GetUserAbilityUseCase,
    AssignRoleUseCase,
    ResolveOrProvisionUserUseCase,
    PermissionsGuard,
    TenantUserGuard,
  ],
  exports: [
    GetUserAbilityUseCase,
    AssignRoleUseCase,
    ResolveOrProvisionUserUseCase,
    PermissionsGuard,
    TenantUserGuard,
  ],
})
export class IamModule {}
