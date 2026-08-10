import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Owns the PrismaClient connection lifecycle and exposes exactly one way to run a
 * query: withTenantContext. It deliberately does NOT extend PrismaClient — a
 * repository that could call `prismaService.student.findMany()` directly would run
 * outside any tenant context, which the RLS policy then resolves to zero rows
 * rather than an error (docs/phase-3-database-design.md §3). Composition instead
 * of inheritance makes "which tenant is this query scoped to" something the
 * compiler can check, not a convention a repository can accidentally skip.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly client = new PrismaClient();

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }

  /**
   * Runs `fn` inside a transaction with Postgres session variable app.tenant_id set
   * for that transaction only. Every RLS-protected table's policy reads this
   * variable, so any query fn issues is automatically scoped to `tenantId` — cross-
   * tenant reads return zero rows, cross-tenant writes are rejected by the policy's
   * WITH CHECK clause (verified against a live database in Phase 6b).
   *
   * set_config(...) is used instead of a literal `SET LOCAL app.tenant_id = '<id>'`
   * string so tenantId goes through Prisma's parameter binding rather than string
   * interpolation into SQL — this is the injection-safe equivalent of SET LOCAL.
   */
  async withTenantContext<T>(
    tenantId: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      return fn(tx);
    });
  }
}

export { Prisma, PrismaClient } from '@prisma/client';
