import { Injectable } from '@nestjs/common';
import { PlatformPrismaService, Prisma } from '@udos/database';
import {
  CreateTenantData,
  TenantRepository,
  TenantSummary,
} from '../application/ports/tenant.repository.port';
import type { TenantStatus } from '../domain/tenant-status-transition';

type TenantRow = { id: string; slug: string; name: string; status: string; createdAt: Date };

function toSummary(tenant: TenantRow): TenantSummary {
  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
    createdAt: tenant.createdAt,
  };
}

@Injectable()
export class PrismaTenantRepository implements TenantRepository {
  constructor(private readonly platformPrisma: PlatformPrismaService) {}

  async existsBySlug(slug: string, tx: Prisma.TransactionClient): Promise<boolean> {
    const count = await tx.tenant.count({ where: { slug } });
    return count > 0;
  }

  async create(data: CreateTenantData, tx: Prisma.TransactionClient): Promise<void> {
    await tx.tenant.create({
      data: {
        id: data.id,
        name: data.name,
        legalName: data.legalName,
        slug: data.slug,
        countryCode: data.countryCode,
        currency: data.currency,
        timezone: data.timezone,
      },
    });
    await tx.campus.create({
      data: {
        tenantId: data.id,
        name: data.primaryCampus.name,
        code: data.primaryCampus.code,
      },
    });
  }

  /** Outside any transaction — used by the tenancy resolution middleware on every request. */
  async findBySlug(slug: string): Promise<TenantSummary | null> {
    const tenant = await this.platformPrisma.tenant.findUnique({ where: { slug } });
    return tenant ? toSummary(tenant) : null;
  }

  async findAll(): Promise<TenantSummary[]> {
    const tenants = await this.platformPrisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
    return tenants.map(toSummary);
  }

  async findByIdInTx(id: string, tx: Prisma.TransactionClient): Promise<TenantSummary | null> {
    const tenant = await tx.tenant.findUnique({ where: { id } });
    return tenant ? toSummary(tenant) : null;
  }

  async updateStatus(id: string, status: TenantStatus, tx: Prisma.TransactionClient): Promise<void> {
    await tx.tenant.update({ where: { id }, data: { status } });
  }
}
