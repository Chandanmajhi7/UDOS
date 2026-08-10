#!/usr/bin/env node
/**
 * Provisions the UDOS Keycloak realm — idempotent, safe to re-run. This is the
 * infrastructure-as-code counterpart to clicking through the Keycloak admin
 * console: same realm config every time, reviewable in a diff, reproducible in
 * any environment (local dev now, Phase 11's cloud deployment later).
 *
 * Deliberately does NOT provision realm roles for tenant-scoped RBAC — that stays
 * in our own database (UserRoleAssignment, Phase 6c), resolved fresh on every
 * request, so a revoked role takes effect immediately rather than waiting for a
 * token to expire. Keycloak's only jobs here are: prove who the user is (identity),
 * carry which tenant they belong to (tenant_id claim), and gate the one genuinely
 * platform-level role — Super Admin — which IS appropriate to carry in the token
 * (Phase 10 design note: Super Admin is a small, rare, high-trust group; ordinary
 * tenant RBAC is not).
 *
 * Usage: KEYCLOAK_URL=http://localhost:8080 node infra/keycloak/setup-realm.mjs
 */

const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? 'http://localhost:8080';
const ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin';

const REALM = 'udos';
const WEB_CLIENT_ID = 'udos-web';
const TEST_CLIENT_ID = 'udos-test-cli';
const WEB_REDIRECT_URIS = ['http://localhost:4200/*'];
const WEB_ORIGINS = ['http://localhost:4200'];
const SUPER_ADMIN_ROLE = 'super-admin';
// 'basic' is Keycloak's built-in scope carrying the core sub/auth_time claims — it
// is normally attached to every client automatically UNLESS defaultClientScopes is
// set explicitly (which REPLACES the realm defaults rather than extending them).
// Omitting it here silently produced access tokens with no `sub` claim at all —
// see docs/phase-10-authentication.md's debugging notes.
const BASE_SCOPES = ['basic', 'acr', 'profile', 'roles', 'email'];

async function getAdminToken() {
  const res = await fetch(`${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
    }),
  });
  if (!res.ok) throw new Error(`Failed to get admin token: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

function api(token) {
  const base = `${KEYCLOAK_URL}/admin/realms`;
  return async (method, path, body) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 409) return { alreadyExists: true };
    if (!res.ok && res.status !== 204) {
      throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
    }
    if (res.status === 204 || res.status === 201) {
      const location = res.headers.get('location');
      return { created: true, id: location?.split('/').pop() };
    }
    return res.json();
  };
}

async function ensureRealm(call) {
  const existing = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}`, {
    headers: { Authorization: `Bearer ${await getAdminToken()}` },
  });
  if (existing.status === 200) {
    console.log(`Realm "${REALM}" already exists`);
    return;
  }
  await call('POST', '', {
    realm: REALM,
    enabled: true,
    displayName: 'UDOS',
    accessTokenLifespan: 300,
    ssoSessionIdleTimeout: 1800,
  });
  console.log(`Created realm "${REALM}"`);
}

/**
 * Keycloak 24+'s declarative User Profile validates every user attribute against a
 * schema and SILENTLY DROPS anything not declared there on create/update via the
 * Admin REST API — this bit us directly: tenant_id attributes written by
 * create-dev-user.mjs vanished with no error. ENABLED here means "any attribute
 * not explicitly declared is still allowed," which is the right default for a
 * dev/setup script; a production User Profile could instead explicitly declare
 * tenant_id and drop this to a stricter policy.
 */
async function ensureUserProfileAllowsCustomAttributes(call) {
  const profile = await call('GET', `/${REALM}/users/profile`);
  if (profile.unmanagedAttributePolicy === 'ENABLED') {
    console.log('User profile already allows unmanaged attributes (tenant_id included)');
    return;
  }
  await call('PUT', `/${REALM}/users/profile`, {
    ...profile,
    unmanagedAttributePolicy: 'ENABLED',
  });
  console.log('Enabled unmanaged user attributes (so tenant_id is actually persisted)');
}

async function ensureTenantClientScope(call) {
  const scopes = await call('GET', `/${REALM}/client-scopes`);
  let scope = scopes.find?.((s) => s.name === 'udos-tenant');
  if (!scope) {
    const result = await call('POST', `/${REALM}/client-scopes`, {
      name: 'udos-tenant',
      protocol: 'openid-connect',
      attributes: { 'include.in.token.scope': 'true', 'display.on.consent.screen': 'false' },
    });
    console.log('Created client scope "udos-tenant"', result);
    const updated = await call('GET', `/${REALM}/client-scopes`);
    scope = updated.find((s) => s.name === 'udos-tenant');
  } else {
    console.log('Client scope "udos-tenant" already exists');
  }

  const mappers = await call(
    'GET',
    `/${REALM}/client-scopes/${scope.id}/protocol-mappers/models`,
  );
  if (!mappers.some((m) => m.name === 'tenant_id')) {
    await call('POST', `/${REALM}/client-scopes/${scope.id}/protocol-mappers/models`, {
      name: 'tenant_id',
      protocol: 'openid-connect',
      protocolMapper: 'oidc-usermodel-attribute-mapper',
      config: {
        'user.attribute': 'tenant_id',
        'claim.name': 'tenant_id',
        'jsonType.label': 'String',
        'id.token.claim': 'true',
        'access.token.claim': 'true',
        'userinfo.token.claim': 'true',
      },
    });
    console.log('Added tenant_id protocol mapper');
  } else {
    console.log('tenant_id protocol mapper already exists');
  }
  return scope;
}

/**
 * Attaches `scopeName` as a default client scope on `clientId` if it isn't already
 * — safe to call every run, and (unlike setting defaultClientScopes only at create
 * time) also fixes a client that was created before a scope was added here.
 */
async function ensureClientHasDefaultScope(call, keycloakClientId, scopeName, allScopesByName) {
  const scope = allScopesByName.get(scopeName);
  if (!scope) throw new Error(`Client scope "${scopeName}" not found in realm`);
  const current = await call(
    'GET',
    `/${REALM}/clients/${keycloakClientId}/default-client-scopes`,
  );
  if (current.some((s) => s.name === scopeName)) return;
  await call(
    'PUT',
    `/${REALM}/clients/${keycloakClientId}/default-client-scopes/${scope.id}`,
  );
  console.log(`  attached default scope "${scopeName}"`);
}

async function ensureWebClient(call, tenantScope, allScopesByName) {
  let clients = await call('GET', `/${REALM}/clients?clientId=${WEB_CLIENT_ID}`);
  if (clients.length === 0) {
    await call('POST', `/${REALM}/clients`, {
      clientId: WEB_CLIENT_ID,
      protocol: 'openid-connect',
      publicClient: true,
      standardFlowEnabled: true,
      directAccessGrantsEnabled: false,
      redirectUris: WEB_REDIRECT_URIS,
      webOrigins: WEB_ORIGINS,
      attributes: { 'pkce.code.challenge.method': 'S256' },
      defaultClientScopes: [...BASE_SCOPES, 'web-origins', tenantScope.name],
    });
    console.log(`Created client "${WEB_CLIENT_ID}"`);
    clients = await call('GET', `/${REALM}/clients?clientId=${WEB_CLIENT_ID}`);
  } else {
    console.log(`Client "${WEB_CLIENT_ID}" already exists`);
  }
  const client = clients[0];
  for (const scopeName of [...BASE_SCOPES, tenantScope.name]) {
    await ensureClientHasDefaultScope(call, client.id, scopeName, allScopesByName);
  }
  return client;
}

/**
 * Direct Access Grants (Resource Owner Password Credentials) client for scripted
 * verification and CI (Phase 10f, later Phase 12) — never used by the real
 * frontend, which is Authorization Code + PKCE only via udos-web. Keeping this
 * capability on a separate client instead of enabling it on udos-web means the
 * browser-facing client stays PKCE-only even in dev.
 */
async function ensureTestClient(call, tenantScope, allScopesByName) {
  let clients = await call('GET', `/${REALM}/clients?clientId=${TEST_CLIENT_ID}`);
  if (clients.length === 0) {
    await call('POST', `/${REALM}/clients`, {
      clientId: TEST_CLIENT_ID,
      protocol: 'openid-connect',
      publicClient: true,
      standardFlowEnabled: false,
      directAccessGrantsEnabled: true,
      defaultClientScopes: [...BASE_SCOPES, tenantScope.name],
    });
    console.log(`Created client "${TEST_CLIENT_ID}" (dev/test only, password grant)`);
    clients = await call('GET', `/${REALM}/clients?clientId=${TEST_CLIENT_ID}`);
  } else {
    console.log(`Client "${TEST_CLIENT_ID}" already exists`);
  }
  const client = clients[0];
  for (const scopeName of [...BASE_SCOPES, tenantScope.name]) {
    await ensureClientHasDefaultScope(call, client.id, scopeName, allScopesByName);
  }
}

async function ensureSuperAdminRole(call) {
  const roles = await call('GET', `/${REALM}/roles`);
  if (roles.some((r) => r.name === SUPER_ADMIN_ROLE)) {
    console.log(`Realm role "${SUPER_ADMIN_ROLE}" already exists`);
    return;
  }
  await call('POST', `/${REALM}/roles`, {
    name: SUPER_ADMIN_ROLE,
    description: 'Software-company staff — platform-wide access (Architecture §6)',
  });
  console.log(`Created realm role "${SUPER_ADMIN_ROLE}"`);
}

async function main() {
  const token = await getAdminToken();
  const call = api(token);

  await ensureRealm(call);
  await ensureUserProfileAllowsCustomAttributes(call);
  const tenantScope = await ensureTenantClientScope(call);
  const allScopes = await call('GET', `/${REALM}/client-scopes`);
  const allScopesByName = new Map(allScopes.map((s) => [s.name, s]));
  await ensureWebClient(call, tenantScope, allScopesByName);
  await ensureTestClient(call, tenantScope, allScopesByName);
  await ensureSuperAdminRole(call);

  console.log('\nRealm setup complete.');
  console.log(`Issuer: ${KEYCLOAK_URL}/realms/${REALM}`);
  console.log(`Web client: ${WEB_CLIENT_ID} (public, Authorization Code + PKCE)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
