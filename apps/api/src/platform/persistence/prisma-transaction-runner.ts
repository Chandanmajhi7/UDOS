import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '@udos/database';
import { TransactionRunner } from './transaction-runner.port';

@Injectable()
export class PrismaTransactionRunner implements TransactionRunner {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(tenantId: string, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.withTenantContext(tenantId, work);
  }
}
