import { Prisma } from '@udos/database';
import { TransactionRunner } from '../../../../platform/persistence/transaction-runner.port';
import { AuditLogRepository } from '../ports/audit-log.repository.port';
import { RecordAuditEntryUseCase } from './record-audit-entry.use-case';

describe('RecordAuditEntryUseCase', () => {
  it('writes the entry within a transaction scoped to the entry\'s own tenant', async () => {
    const fakeTx = {} as Prisma.TransactionClient;
    const txRunner: TransactionRunner = { run: jest.fn((_tenantId, work) => work(fakeTx)) };
    const auditLogs: AuditLogRepository = { record: jest.fn().mockResolvedValue(undefined) };
    const useCase = new RecordAuditEntryUseCase(txRunner, auditLogs);

    const input = {
      tenantId: 'tenant-1',
      action: 'iam.role_assigned',
      entityType: 'iam',
      entityId: 'role-teacher',
      afterState: { roleId: 'role-teacher' },
    };

    await useCase.execute(input);

    expect(txRunner.run).toHaveBeenCalledWith('tenant-1', expect.any(Function));
    expect(auditLogs.record).toHaveBeenCalledWith(input, fakeTx);
  });
});
