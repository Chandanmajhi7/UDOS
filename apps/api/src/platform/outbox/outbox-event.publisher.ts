import { Injectable } from '@nestjs/common';
import { Prisma } from '@udos/database';
import { DomainEvent } from '../events/domain-event';
import { DomainEventPublisher } from '../events/domain-event-publisher.port';

/**
 * The real DomainEventPublisher implementation: writes to outbox_events inside the
 * caller's transaction (Architecture §4, docs/phase-3-database-design.md §4/§8).
 * Delivery to subscribers (Audit module, Phase 6e) is a separate concern handled by
 * OutboxRelay, which polls unprocessed rows — this class only guarantees the event
 * was durably recorded atomically with the state change, nothing about when or how
 * it's eventually delivered.
 */
@Injectable()
export class OutboxEventPublisher implements DomainEventPublisher {
  async publish(event: DomainEvent, tx: Prisma.TransactionClient): Promise<void> {
    const { type, tenantId, ...payload } = event;
    await tx.outboxEvent.create({
      data: {
        tenantId,
        eventType: type,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }
}
