import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Partner } from '../partners/partner.entity';
import { Product } from '../products/product.entity';
import { BomItem } from '../bom/bom-item.entity';
import { PurchaseOrder } from '../purchasing/purchase-order.entity';
import { PurchaseOrderItem } from '../purchasing/purchase-order-item.entity';
import { SalesOrder } from '../sales/sales-order.entity';
import { SalesOrderItem } from '../sales/sales-order-item.entity';
import { ProductionOrder } from '../production/production-order.entity';
import { StockMovement } from '../inventory/stock-movement.entity';
import { FinanceEntry } from '../finance/finance-entry.entity';
import { App } from '../apps/app.entity';
import { EmergencyAccessGrant } from '../security/emergency-access-grant.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { CompanySettings } from '../settings/company-settings.entity';

export const typeOrmEntities = [
  User,
  Partner,
  Product,
  BomItem,
  PurchaseOrder,
  PurchaseOrderItem,
  SalesOrder,
  SalesOrderItem,
  ProductionOrder,
  StockMovement,
  FinanceEntry,
  App,
  EmergencyAccessGrant,
  AuditLog,
  CompanySettings,
];

export function buildTypeOrmConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    username: process.env.DB_USERNAME ?? 'sysvex',
    password: process.env.DB_PASSWORD ?? 'sysvex',
    database: process.env.DB_NAME ?? 'sysvex',
    entities: typeOrmEntities,
    synchronize: process.env.DB_SYNCHRONIZE !== 'false',
    logging: process.env.DB_LOGGING === 'true',
  };
}
