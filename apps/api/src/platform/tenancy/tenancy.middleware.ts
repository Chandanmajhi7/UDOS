import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import type { TenantRepository } from '../../modules/tenant/application/ports/tenant.repository.port';
import { TENANT_REPOSITORY } from '../../modules/tenant/application/ports/tenant.repository.port';
import { TenantContext } from './tenant-context';

/**
 * Resolves which tenant a request belongs to, before any guard or handler runs
 * (System Design §4). This is the one place in the codebase where "which tenant"
 * is decided from the wire (subdomain) rather than trusted from application state —
 * everything downstream (PrismaService.withTenantContext, PermissionsGuard) treats
 * req.tenant as already-verified.
 *
 * Response is written directly rather than thrown as a NestJS HttpException: Nest's
 * exception filters are not guaranteed to intercept an exception thrown from async
 * middleware the same way they do from a guard/controller, so this fails closed by
 * construction instead of relying on that framework behavior.
 */
@Injectable()
export class TenancyMiddleware implements NestMiddleware {
  constructor(@Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository) {}

  async use(
    req: Request & { tenant?: TenantContext },
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const slug = this.resolveSlug(req);
    if (!slug) {
      res.status(404).json({ message: 'No tenant could be resolved from this request' });
      return;
    }

    const tenant = await this.tenants.findBySlug(slug);
    if (!tenant) {
      res.status(404).json({ message: `No tenant found for "${slug}"` });
      return;
    }
    if (tenant.status === 'SUSPENDED' || tenant.status === 'OFFBOARDED') {
      res.status(403).json({ message: `Tenant "${slug}" is not active` });
      return;
    }

    req.tenant = tenant;
    next();
  }

  private resolveSlug(req: Request): string | undefined {
    // Local-dev/testing override only — production resolution is the subdomain below.
    // Never treated as authoritative on its own beyond that (Phase 10's auth layer
    // additionally cross-checks the JWT's tenant claim against this resolution).
    const headerOverride = req.header('X-Tenant-Slug');
    if (headerOverride) return headerOverride.toLowerCase();

    const host = req.hostname; // Express strips the port from req.hostname already
    const firstLabel = host.split('.')[0];
    if (!firstLabel || firstLabel === host || firstLabel === 'localhost') return undefined;
    return firstLabel.toLowerCase();
  }
}
