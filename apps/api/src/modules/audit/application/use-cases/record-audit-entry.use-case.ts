import { Inject, Injectable } from '@nestjs/common';
import type { TransactionRunner } from '../../../../platform/persistence/transaction-runner.port';
import { TRANSACTION_RUNNER } from '../../../../platform/persistence/transaction-runner.port';
import type {
  AuditLogRepository,
  RecordAuditEntryData,
} from '../ports/audit-log.repository.port';
import { AUDIT_LOG_REPOSITORY } from '../ports/audit-log.repository.port';

/**
 * Writes via the ordinary tenant-scoped connection (TRANSACTION_RUNNER), not the
 * platform-admin one — an audit entry belongs to, and should only ever be readable
 * within, its own tenant's context, same as every other tenant-owned row. Only the
 * relay that discovers WHICH events exist across tenants needs the bypass path
 * (OutboxRelay); recording the entry itself does not.
 */
@Injectable()
export class RecordAuditEntryUseCase {
  constructor(
    @Inject(TRANSACTION_RUNNER) private readonly txRunner: TransactionRunner,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
  ) {}

  async execute(input: RecordAuditEntryData): Promise<void> {
    await this.txRunner.run(input.tenantId, (tx) => this.auditLogs.record(input, tx));
  }
}
