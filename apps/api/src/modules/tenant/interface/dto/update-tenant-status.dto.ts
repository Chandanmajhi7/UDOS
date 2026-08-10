import { IsIn } from 'class-validator';
import type { TenantStatus } from '../../domain/tenant-status-transition';

const ASSIGNABLE_STATUSES: TenantStatus[] = ['ACTIVE', 'SUSPENDED', 'OFFBOARDED'];

export class UpdateTenantStatusDto {
  // PENDING is set only at provisioning time — never a valid target here.
  @IsIn(ASSIGNABLE_STATUSES)
  status!: TenantStatus;
}
