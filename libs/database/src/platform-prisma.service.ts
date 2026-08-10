import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * A second, separate connection — authenticated as udos_platform_admin (BYPASSRLS) —
 * for the narrow set of operations that must act before a tenant context exists or
 * across tenants entirely: tenant provisioning and the Super Admin console (Phase 8).
 * See prisma/migrations/20260806140000_restrict_tenants_table_access and
 * docs/phase-2-architecture.md §6 ("Super Admin bypass").
 *
 * Deliberately a distinct class from PrismaService, not a mode/flag on it — importing
 * PlatformPrismaService is meant to read as a visible, reviewable decision ("this code
 * touches the platform-admin connection"), not a parameter that's easy to flip
 * accidentally in a tenant-facing request handler.
 */
@Injectable()
export class PlatformPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ datasourceUrl: process.env.PLATFORM_DATABASE_URL });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
