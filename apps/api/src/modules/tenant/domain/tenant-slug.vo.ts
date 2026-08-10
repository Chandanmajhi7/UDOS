const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * A tenant's slug becomes its subdomain (<slug>.udos.app, Architecture §5), so it is
 * validated against DNS label rules, not just "any string" — an invalid slug here
 * would silently break tenant resolution for every request to that tenant later.
 */
export class TenantSlug {
  private constructor(public readonly value: string) {}

  static create(raw: string): TenantSlug {
    const normalized = raw.trim().toLowerCase();

    if (normalized.length < 3 || normalized.length > 63) {
      throw new Error(`Invalid tenant slug "${raw}": must be between 3 and 63 characters`);
    }
    if (!SLUG_PATTERN.test(normalized)) {
      throw new Error(
        `Invalid tenant slug "${raw}": must be lowercase alphanumeric segments separated by single hyphens`,
      );
    }

    return new TenantSlug(normalized);
  }
}
