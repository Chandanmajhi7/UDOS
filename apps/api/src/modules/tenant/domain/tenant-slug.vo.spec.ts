import { TenantSlug } from './tenant-slug.vo';

describe('TenantSlug', () => {
  it('accepts a well-formed slug and normalizes case', () => {
    expect(TenantSlug.create('Acme-College').value).toBe('acme-college');
  });

  it.each(['ab', 'a'.repeat(64)])('rejects a slug of invalid length: %s', (raw) => {
    expect(() => TenantSlug.create(raw)).toThrow(/between 3 and 63 characters/);
  });

  it.each(['Acme College', 'acme_college', 'acme--college', '-acme', 'acme-', 'acme.college'])(
    'rejects a malformed slug: %s',
    (raw) => {
      expect(() => TenantSlug.create(raw)).toThrow(/lowercase alphanumeric/);
    },
  );
});
