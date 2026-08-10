import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Opts a route out of AuthGuard's default-deny (health checks, future webhooks). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
