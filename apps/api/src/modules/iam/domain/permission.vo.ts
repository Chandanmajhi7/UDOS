/**
 * A permission code, e.g. "attendance:read", "fee:waive" — matches the `code`
 * column on the `permissions` table (prisma/schema.prisma).
 */
export class Permission {
  constructor(public readonly code: string) {}

  equals(other: Permission): boolean {
    return this.code === other.code;
  }
}
