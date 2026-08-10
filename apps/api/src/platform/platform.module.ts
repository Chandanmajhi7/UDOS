import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PlatformPrismaService, PrismaService } from '@udos/database';
import { TRANSACTION_RUNNER } from './persistence/transaction-runner.port';
import { PrismaTransactionRunner } from './persistence/prisma-transaction-runner';
import { PLATFORM_TRANSACTION_RUNNER } from './persistence/platform-transaction-runner.port';
import { PrismaPlatformTransactionRunner } from './persistence/prisma-platform-transaction-runner';
import { DOMAIN_EVENT_PUBLISHER } from './events/domain-event-publisher.port';
import { OutboxEventPublisher } from './outbox/outbox-event.publisher';
import { OutboxRelay } from './outbox/outbox-relay';
import { JwtVerifierService } from './auth/jwt-verifier.service';
import { AuthGuard } from './auth/auth.guard';

/**
 * Cross-cutting infrastructure every feature module depends on (Architecture §1's
 * "platform/" layer): the tenant-scoped transaction runner, the platform-admin
 * transaction runner (Architecture §6 bypass path), the outbox-backed domain event
 * publisher, the relay that delivers outbox events to in-process subscribers
 * (Audit module, Phase 6e), and — as of Phase 10 — the global AuthGuard that makes
 * every route require a valid token by default. @Global so feature modules inject
 * these tokens without each re-importing this module explicitly.
 */
@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [
    PrismaService,
    PlatformPrismaService,
    { provide: TRANSACTION_RUNNER, useClass: PrismaTransactionRunner },
    { provide: PLATFORM_TRANSACTION_RUNNER, useClass: PrismaPlatformTransactionRunner },
    { provide: DOMAIN_EVENT_PUBLISHER, useClass: OutboxEventPublisher },
    OutboxRelay,
    JwtVerifierService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [
    PrismaService,
    PlatformPrismaService,
    TRANSACTION_RUNNER,
    PLATFORM_TRANSACTION_RUNNER,
    DOMAIN_EVENT_PUBLISHER,
    OutboxRelay,
    JwtVerifierService,
  ],
})
export class PlatformModule {}
