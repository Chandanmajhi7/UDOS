export interface JwtPayload {
  /** Keycloak's internal user id — maps to User.keycloakSubjectId. */
  sub: string;
  /** Set by the udos-tenant client scope's protocol mapper (infra/keycloak/setup-realm.mjs). */
  tenant_id?: string;
  email?: string;
  name?: string;
  realm_access?: { roles: string[] };
}
