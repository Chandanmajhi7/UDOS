import { Prisma } from '@udos/database';
import type { TenantStatus } from '../../domain/tenant-status-transition';

export const TENANT_REPOSITORY = Symbol('TENANT_REPOSITORY');

export interface CreateTenantData {
  id: string;
  name: string;
  legalName: string;
  slug: string;
  countryCode: string;
  currency: string;
  timezone: string;
  primaryCampus: { name: string; code: string };
}

export interface TenantSummary {
  id: string;
  slug: string;
  name: string;
  status: string;
  createdAt: Date;
}

export interface TenantRepository {
  existsBySlug(slug: string, tx: Prisma.TransactionClient): Promise<boolean>;
  create(data: CreateTenantData, tx: Prisma.TransactionClient): Promise<void>;
  /** Used by the tenancy resolution middleware — reads via the platform-admin connection. */
  findBySlug(slug: string): Promise<TenantSummary | null>;
  /** Super Admin console — reads across all tenants via the platform-admin connection. */
  findAll(): Promise<TenantSummary[]>;
  /** Within a transaction, so status-transition validation and the write it guards see a consistent row. */
  findByIdInTx(id: string, tx: Prisma.TransactionClient): Promise<TenantSummary | null>;
  updateStatus(id: string, status: TenantStatus, tx: Prisma.TransactionClient): Promise<void>;
}
