import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlatformPrismaService } from '@udos/database';

export const OUTBOX_EVENT_CHANNEL = 'outbox.event';

/**
 * Delivers durably-recorded outbox rows (Architecture §4) to in-process subscribers
 * (the Audit module) by polling — not Kafka/BullMQ, which the target deployment
 * doesn't have running everywhere this codebase runs yet (see docs/phase-2-architecture.md
 * §4's own note that BullMQ is "sufficient for Wave 0-1 volume"). Swapping the
 * dispatch mechanism later is an internal change to this class only; OutboxEventPublisher
 * (the write side) and every subscriber are unaffected either way — that separation is
 * the actual point of the outbox pattern, not a specific queue technology.
 *
 * Scans across ALL tenants each poll, so it runs on the platform-admin (BYPASSRLS)
 * connection — a legitimate, narrow use of that bypass, distinct from ordinary
 * request handling (Architecture §6).
 */
@Injectable()
export class OutboxRelay {
  private readonly logger = new Logger(OutboxRelay.name);

  constructor(
    private readonly platformPrisma: PlatformPrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Returns the number of events relayed. Exposed directly (not just via a timer) so it's testable deterministically. */
  async pollOnce(batchSize = 50): Promise<number> {
    const pending = await this.platformPrisma.outboxEvent.findMany({
      where: { processedAt: null },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    for (const row of pending) {
      try {
        await this.eventEmitter.emitAsync(OUTBOX_EVENT_CHANNEL, {
          type: row.eventType,
          tenantId: row.tenantId,
          ...(row.payload as Record<string, unknown>),
        });
        await this.platformPrisma.outboxEvent.update({
          where: { id: row.id },
          data: { processedAt: new Date() },
        });
      } catch (error) {
        // Deliberately left unprocessed (processedAt stays null) so the next poll
        // retries it — a subscriber throwing must not silently drop the event.
        this.logger.error(`Failed to relay outbox event ${row.id} (${row.eventType})`, error);
      }
    }

    return pending.length;
  }
}
