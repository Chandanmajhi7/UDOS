import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

/** Route-level RBAC gate — see PermissionsGuard for how this is enforced. */
export const RequirePermission = (code: string) => SetMetadata(REQUIRE_PERMISSION_KEY, code);
