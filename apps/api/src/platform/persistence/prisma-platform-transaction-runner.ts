import { Injectable } from '@nestjs/common';
import { PlatformPrismaService, Prisma } from '@udos/database';
import { PlatformTransactionRunner } from './platform-transaction-runner.port';

@Injectable()
export class PrismaPlatformTransactionRunner implements PlatformTransactionRunner {
  constructor(private readonly platformPrisma: PlatformPrismaService) {}

  run<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.platformPrisma.$transaction(work);
  }
}
