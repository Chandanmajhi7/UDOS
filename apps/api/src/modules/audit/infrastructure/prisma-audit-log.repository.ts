import { Injectable } from '@nestjs/common';
import { Prisma } from '@udos/database';
import {
  AuditLogRepository,
  RecordAuditEntryData,
} from '../application/ports/audit-log.repository.port';

@Injectable()
export class PrismaAuditLogRepository implements AuditLogRepository {
  async record(data: RecordAuditEntryData, tx: Prisma.TransactionClient): Promise<void> {
    await tx.auditLog.create({
      data: {
        tenantId: data.tenantId,
        actorUserId: data.actorUserId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        afterState: data.afterState as Prisma.InputJsonValue,
      },
    });
  }
}
