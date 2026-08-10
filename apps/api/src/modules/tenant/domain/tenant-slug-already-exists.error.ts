export class TenantSlugAlreadyExistsError extends Error {
  constructor(slug: string) {
    super(`A tenant with slug "${slug}" already exists`);
    this.name = 'TenantSlugAlreadyExistsError';
  }
}
