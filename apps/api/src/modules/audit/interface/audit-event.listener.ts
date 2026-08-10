import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OUTBOX_EVENT_CHANNEL } from '../../../platform/outbox/outbox-relay';
import { RecordAuditEntryUseCase } from '../application/use-cases/record-audit-entry.use-case';

interface RelayedEvent {
  type: string;
  tenantId: string;
  [key: string]: unknown;
}

/**
 * Subscribes to every event OutboxRelay delivers (Architecture §2: "AUDIT -.->|write
 * interceptor| every module") and records each as an audit entry. Deliberately
 * generic rather than one listener per event type — Wave 0 has two event types
 * (iam.role_assigned, tenant.provisioned) and Wave 2+ will add many more; this
 * mapping stays correct without changes as new event types are introduced,
 * because it derives entityType/entityId structurally instead of enumerating cases.
 */
@Injectable()
export class AuditEventListener {
  private readonly logger = new Logger(AuditEventListener.name);

  constructor(private readonly recordAuditEntry: RecordAuditEntryUseCase) {}

  @OnEvent(OUTBOX_EVENT_CHANNEL)
  async handle(event: RelayedEvent): Promise<void> {
    const { type, tenantId, ...payload } = event;

    await this.recordAuditEntry.execute({
      tenantId,
      action: type,
      entityType: type.split('.')[0],
      entityId: (payload.roleId as string) ?? (payload.userId as string) ?? tenantId,
      actorUserId: payload.userId as string | undefined,
      afterState: payload,
    });

    this.logger.debug(`Recorded audit entry for ${type} (tenant ${tenantId})`);
  }
}
