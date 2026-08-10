#!/usr/bin/env node
/**
 * Dev-only helper: creates a Keycloak user in the udos realm with a tenant_id
 * attribute, so there's someone to actually log in as. Production user
 * provisioning is a Super Admin console feature that doesn't exist yet — this
 * script exists so Phase 10's auth flow has something real to test end-to-end.
 *
 * Usage:
 *   node infra/keycloak/create-dev-user.mjs <username> <password> <tenantId> [--super-admin]
 */

const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? 'http://localhost:8080';
const REALM = 'udos';

const [username, password, tenantId, flag] = process.argv.slice(2);
if (!username || !password) {
  console.error(
    'Usage: node create-dev-user.mjs <username> <password> [tenantId] [--super-admin]',
  );
  process.exit(1);
}

async function getAdminToken() {
  const res = await fetch(`${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: process.env.KEYCLOAK_ADMIN_USERNAME ?? 'admin',
      password: process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin',
    }),
  });
  if (!res.ok) throw new Error(`Failed to get admin token: ${res.status}`);
  return (await res.json()).access_token;
}

async function main() {
  const token = await getAdminToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const existing = await fetch(
    `${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=${username}&exact=true`,
    { headers },
  ).then((r) => r.json());

  let userId;
  if (existing.length > 0) {
    userId = existing[0].id;
    console.log(`User "${username}" already exists (${userId}) — updating attributes`);
    await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/users/${userId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        email: `${username}@udos.dev`,
        firstName: username,
        lastName: 'Dev',
        emailVerified: true,
        attributes: tenantId ? { tenant_id: [tenantId] } : {},
        enabled: true,
      }),
    });
  } else {
    // firstName/lastName/email are required by Keycloak 26's default User Profile —
    // omitting them causes direct-grant login to fail with the misleading
    // "Account is not fully set up" error rather than a clear validation message.
    const createRes = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        username,
        email: `${username}@udos.dev`,
        firstName: username,
        lastName: 'Dev',
        enabled: true,
        emailVerified: true,
        attributes: tenantId ? { tenant_id: [tenantId] } : {},
      }),
    });
    if (!createRes.ok) throw new Error(`Create user failed: ${createRes.status} ${await createRes.text()}`);
    userId = createRes.headers.get('location').split('/').pop();
    console.log(`Created user "${username}" (${userId})`);
  }

  await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/users/${userId}/reset-password`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ type: 'password', value: password, temporary: false }),
  });
  console.log('Password set');

  if (flag === '--super-admin') {
    const role = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/roles/super-admin`, {
      headers,
    }).then((r) => r.json());
    await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/users/${userId}/role-mappings/realm`, {
      method: 'POST',
      headers,
      body: JSON.stringify([role]),
    });
    console.log('Assigned realm role "super-admin"');
  }

  console.log(`\nkeycloakSubjectId (for the User.keycloakSubjectId column): ${userId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
