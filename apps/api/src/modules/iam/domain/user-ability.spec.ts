import { Permission } from './permission.vo';
import { Role } from './role.entity';
import { ScopedRoleAssignment, UserAbility } from './user-ability';

describe('UserAbility', () => {
  const teacherRole = new Role('role-teacher', 'Teacher', [
    new Permission('attendance:read'),
    new Permission('attendance:write'),
  ]);
  const hodRole = new Role('role-hod', 'HOD', [new Permission('department:manage')]);

  it('grants a permission held by an unscoped assignment regardless of requested scope', () => {
    const ability = new UserAbility([new ScopedRoleAssignment(teacherRole)]);

    expect(ability.can('attendance:read')).toBe(true);
    expect(ability.can('attendance:read', { campusId: 'campus-1' })).toBe(true);
  });

  it('denies a permission no assigned role grants', () => {
    const ability = new UserAbility([new ScopedRoleAssignment(teacherRole)]);

    expect(ability.can('fee:waive')).toBe(false);
  });

  it('grants a scoped permission only within the matching scope', () => {
    const ability = new UserAbility([
      new ScopedRoleAssignment(hodRole, { departmentId: 'dept-cs' }),
    ]);

    expect(ability.can('department:manage', { departmentId: 'dept-cs' })).toBe(true);
    expect(ability.can('department:manage', { departmentId: 'dept-physics' })).toBe(false);
    expect(ability.can('department:manage')).toBe(false);
  });

  it('combines multiple role assignments additively', () => {
    const ability = new UserAbility([
      new ScopedRoleAssignment(teacherRole),
      new ScopedRoleAssignment(hodRole, { departmentId: 'dept-cs' }),
    ]);

    expect(ability.can('attendance:read')).toBe(true);
    expect(ability.can('department:manage', { departmentId: 'dept-cs' })).toBe(true);
  });
});
