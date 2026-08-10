/**
 * The shape every authenticated request carries once Phase 10 wires real Keycloak
 * token verification. Deliberately minimal — id + tenantId only. Permissions guards
 * (IAM module) resolve the user's roles from the database on each request rather
 * than trusting role claims embedded in the JWT, so a revoked role takes effect
 * immediately rather than waiting for token expiry.
 *
 * Populated by an authentication middleware/guard that does not exist yet — see
 * Phase 10. Nothing in Phase 6 fabricates a fake version of it; PermissionsGuard
 * (modules/iam/interface) simply reads `req.user` and denies access if it is absent,
 * which is exactly the correct behavior both now (no auth wired) and after Phase 10.
 */
export interface RequestUser {
  id: string;
  tenantId: string;
}
