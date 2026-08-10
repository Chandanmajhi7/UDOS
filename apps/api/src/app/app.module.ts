import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { TenancyMiddleware } from '../platform/tenancy/tenancy.middleware';
import { IamModule } from '../modules/iam/iam.module';
import { TenantModule } from '../modules/tenant/tenant.module';
import { AuditModule } from '../modules/audit/audit.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [PlatformModule, IamModule, TenantModule, AuditModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // The root health-check route (AppController's GET /api) and the Super Admin
    // console (admin/*, Phase 8) stay tenant-agnostic — the admin routes act across
    // tenants or before a tenant exists at all, so there is no tenant to resolve.
    // Everything else is presumed tenant-scoped once real routes exist (Wave 1+).
    consumer.apply(TenancyMiddleware).exclude('api', 'admin/{*path}').forRoutes('*path');
  }
}
