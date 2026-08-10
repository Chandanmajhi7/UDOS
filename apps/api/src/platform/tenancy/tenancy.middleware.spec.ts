import { TenantRepository, TenantSummary } from '../../modules/tenant/application/ports/tenant.repository.port';
import { TenancyMiddleware } from './tenancy.middleware';

function buildResponse() {
  const res: { statusCode?: number; body?: unknown; status: jest.Mock; json: jest.Mock } = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json.mockImplementation((body: unknown) => {
    res.body = body;
    return res;
  });
  return res;
}

function buildRequest(opts: { hostname: string; headerOverride?: string }) {
  return {
    hostname: opts.hostname,
    header: (name: string) => (name === 'X-Tenant-Slug' ? opts.headerOverride : undefined),
  } as unknown as Parameters<TenancyMiddleware['use']>[0];
}

describe('TenancyMiddleware', () => {
  function buildMiddleware(tenant: TenantSummary | null) {
    const tenants: TenantRepository = {
      existsBySlug: jest.fn(),
      create: jest.fn(),
      findBySlug: jest.fn().mockResolvedValue(tenant),
      findAll: jest.fn(),
      findByIdInTx: jest.fn(),
      updateStatus: jest.fn(),
    };
    return { middleware: new TenancyMiddleware(tenants), tenants };
  }

  it('resolves the tenant from the subdomain and attaches it to the request', async () => {
    const tenant: TenantSummary = { id: 't1', slug: 'acme', name: 'Acme University', status: 'ACTIVE', createdAt: new Date('2026-01-01') };
    const { middleware, tenants } = buildMiddleware(tenant);
    const req = buildRequest({ hostname: 'acme.udos.app' });
    const res = buildResponse();
    const next = jest.fn();

    await middleware.use(req, res as never, next);

    expect(tenants.findBySlug).toHaveBeenCalledWith('acme');
    expect((req as { tenant?: TenantSummary }).tenant).toEqual(tenant);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('prefers the X-Tenant-Slug override header over the subdomain', async () => {
    const tenant: TenantSummary = { id: 't2', slug: 'override-tenant', name: 'Override University', status: 'ACTIVE', createdAt: new Date('2026-01-01') };
    const { middleware, tenants } = buildMiddleware(tenant);
    const req = buildRequest({ hostname: 'acme.udos.app', headerOverride: 'Override-Tenant' });
    const next = jest.fn();

    await middleware.use(req, buildResponse() as never, next);

    expect(tenants.findBySlug).toHaveBeenCalledWith('override-tenant');
  });

  it('responds 404 when no tenant can be resolved from the host', async () => {
    const { middleware } = buildMiddleware(null);
    const req = buildRequest({ hostname: 'localhost' });
    const res = buildResponse();
    const next = jest.fn();

    await middleware.use(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 404 when the slug does not match any tenant', async () => {
    const { middleware } = buildMiddleware(null);
    const req = buildRequest({ hostname: 'ghost.udos.app' });
    const res = buildResponse();
    const next = jest.fn();

    await middleware.use(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 403 when the resolved tenant is suspended', async () => {
    const tenant: TenantSummary = { id: 't3', slug: 'suspended-co', name: 'Suspended College', status: 'SUSPENDED', createdAt: new Date('2026-01-01') };
    const { middleware } = buildMiddleware(tenant);
    const req = buildRequest({ hostname: 'suspended-co.udos.app' });
    const res = buildResponse();
    const next = jest.fn();

    await middleware.use(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
