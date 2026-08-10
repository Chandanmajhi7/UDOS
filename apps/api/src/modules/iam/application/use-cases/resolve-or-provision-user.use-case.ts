import { Inject, Injectable } from '@nestjs/common';
import type { TransactionRunner } from '../../../../platform/persistence/transaction-runner.port';
import { TRANSACTION_RUNNER } from '../../../../platform/persistence/transaction-runner.port';
import type { AppUser, UserRepository } from '../ports/user.repository.port';
import { USER_REPOSITORY } from '../ports/user.repository.port';

export interface ResolveOrProvisionUserInput {
  keycloakSubjectId: string;
  tenantId: string;
  email: string;
  fullName: string;
}

/**
 * Just-in-time user provisioning: the first time a Keycloak identity we've never
 * seen makes an authenticated request for a given tenant, create the local User
 * row that IAM's RBAC/ABAC (UserRoleAssignment, Phase 6c) is keyed on. This is a
 * standard pattern for SSO-backed apps, not a shortcut — a real user-invitation
 * flow (Super Admin console feature) can coexist with it later; JIT provisioning
 * just means "your first successful login is enough," which is fine before that
 * exists. A JIT-provisioned user starts with zero role assignments — the request
 * that provisioned them still won't pass any @RequirePermission check.
 */
@Injectable()
export class ResolveOrProvisionUserUseCase {
  constructor(
    @Inject(TRANSACTION_RUNNER) private readonly txRunner: TransactionRunner,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(input: ResolveOrProvisionUserInput): Promise<AppUser> {
    return this.txRunner.run(input.tenantId, async (tx) => {
      const existing = await this.users.findByKeycloakSubjectId(input.keycloakSubjectId, tx);
      if (existing) return existing;

      return this.users.create(
        {
          tenantId: input.tenantId,
          keycloakSubjectId: input.keycloakSubjectId,
          email: input.email,
          fullName: input.fullName,
        },
        tx,
      );
    });
  }
}
