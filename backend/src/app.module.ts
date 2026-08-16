import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildTypeOrmConfig } from './config/typeorm.config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PartnersModule } from './partners/partners.module';
import { ProductsModule } from './products/products.module';
import { BomModule } from './bom/bom.module';
import { PurchasingModule } from './purchasing/purchasing.module';
import { SalesModule } from './sales/sales.module';
import { ProductionModule } from './production/production.module';
import { InventoryModule } from './inventory/inventory.module';
import { FinanceModule } from './finance/finance.module';
import { AppsModule } from './apps/apps.module';
import { AuditModule } from './audit/audit.module';
import { SecurityModule } from './security/security.module';
import { SystemModule } from './system/system.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(buildTypeOrmConfig()),
    AuthModule,
    UsersModule,
    PartnersModule,
    ProductsModule,
    BomModule,
    PurchasingModule,
    SalesModule,
    ProductionModule,
    InventoryModule,
    FinanceModule,
    AppsModule,
    AuditModule,
    SecurityModule,
    SystemModule,
    SettingsModule,
  ],
})
export class AppModule {}
