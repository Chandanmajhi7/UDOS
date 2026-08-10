import { Permission } from './permission.vo';

export class Role {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly permissions: readonly Permission[],
  ) {}

  can(permissionCode: string): boolean {
    return this.permissions.some((permission) => permission.code === permissionCode);
  }
}
