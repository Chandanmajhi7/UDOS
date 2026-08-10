import { Module } from '@nestjs/common';
import { PrismaAuditLogRepository } from './infrastructure/prisma-audit-log.repository';
import { AUDIT_LOG_REPOSITORY } from './application/ports/audit-log.repository.port';
import { RecordAuditEntryUseCase } from './application/use-cases/record-audit-entry.use-case';
import { AuditEventListener } from './interface/audit-event.listener';

@Module({
  providers: [
    { provide: AUDIT_LOG_REPOSITORY, useClass: PrismaAuditLogRepository },
    RecordAuditEntryUseCase,
    AuditEventListener,
  ],
  exports: [RecordAuditEntryUseCase],
})
export class AuditModule {}
