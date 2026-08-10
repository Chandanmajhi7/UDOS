import { Prisma } from '@udos/database';

export const TRANSACTION_RUNNER = Symbol('TRANSACTION_RUNNER');

/**
 * The port application-layer use cases depend on to run multi-repository writes
 * (plus a domain event publish) as one tenant-scoped transaction, without importing
 * PrismaService — only its structural transaction type. Implemented by
 * PrismaTransactionRunner (infrastructure), which is a thin wrapper over
 * PrismaService.withTenantContext (libs/database).
 */
export interface TransactionRunner {
  run<T>(tenantId: string, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
