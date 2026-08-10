import { Prisma } from '@udos/database';

export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');

export interface RecordAuditEntryData {
  tenantId: string;
  action: string;
  entityType: string;
  entityId: string;
  actorUserId?: string;
  afterState?: Record<string, unknown>;
}

export interface AuditLogRepository {
  record(data: RecordAuditEntryData, tx: Prisma.TransactionClient): Promise<void>;
}
