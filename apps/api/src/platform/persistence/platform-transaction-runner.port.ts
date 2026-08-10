import { Prisma } from '@udos/database';

export const PLATFORM_TRANSACTION_RUNNER = Symbol('PLATFORM_TRANSACTION_RUNNER');

/**
 * Like TransactionRunner, but for operations that must run on the platform-admin
 * (BYPASSRLS) connection — no tenantId to scope by, because the operation either
 * creates the tenant itself or legitimately spans tenants (Super Admin console,
 * Phase 8). See libs/database/src/platform-prisma.service.ts.
 */
export interface PlatformTransactionRunner {
  run<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
