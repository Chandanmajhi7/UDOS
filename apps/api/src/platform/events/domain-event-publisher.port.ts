import { Prisma } from '@udos/database';
import { DomainEvent } from './domain-event';

export const DOMAIN_EVENT_PUBLISHER = Symbol('DOMAIN_EVENT_PUBLISHER');

/**
 * Every module that changes state and needs another module to react publishes
 * through this port, never by calling the other module directly (Architecture §4).
 * `tx` is required, not optional: the whole point of the outbox pattern is that the
 * event write lands in the SAME transaction as the state change it describes, so a
 * partial failure can't lose an event or record one that never actually happened.
 * The real implementation (OutboxEventPublisher, Phase 6e) writes to the
 * outbox_events table; call sites don't know or care how the event is eventually
 * delivered to subscribers.
 */
export interface DomainEventPublisher {
  publish(event: DomainEvent, tx: Prisma.TransactionClient): Promise<void>;
}
