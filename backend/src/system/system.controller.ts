import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User, UserRole } from '../users/user.entity';
import { Partner } from '../partners/partner.entity';
import { Product } from '../products/product.entity';
import { PurchaseOrder } from '../purchasing/purchase-order.entity';
import { SalesOrder } from '../sales/sales-order.entity';
import { ProductionOrder } from '../production/production-order.entity';
import { FinanceEntry } from '../finance/finance-entry.entity';
import * as packageJson from '../../package.json';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SX_SYSTEM)
@Controller('system')
export class SystemController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // Painel de status real: só expõe dados verificáveis (conexão com o
  // banco, versão, ambiente, uptime e contagens de registros) — nada
  // simulado, já que o SYSVEX não tem infraestrutura multi-tenant real.
  @Get('status')
  async status() {
    const dbCheckStart = Date.now();
    let dbStatus: { ok: boolean; latencyMs?: number; error?: string };
    try {
      await this.dataSource.query('SELECT 1');
      dbStatus = { ok: true, latencyMs: Date.now() - dbCheckStart };
    } catch (err) {
      dbStatus = { ok: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    }

    const [users, partners, products, purchaseOrders, salesOrders, productionOrders, financeEntries] =
      await Promise.all([
        this.dataSource.getRepository(User).count(),
        this.dataSource.getRepository(Partner).count(),
        this.dataSource.getRepository(Product).count(),
        this.dataSource.getRepository(PurchaseOrder).count(),
        this.dataSource.getRepository(SalesOrder).count(),
        this.dataSource.getRepository(ProductionOrder).count(),
        this.dataSource.getRepository(FinanceEntry).count(),
      ]);

    return {
      appVersion: packageJson.version,
      environment: process.env.NODE_ENV ?? 'development',
      serverTime: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: dbStatus,
      recordCounts: {
        users,
        partners,
        products,
        purchaseOrders,
        salesOrders,
        productionOrders,
        financeEntries,
      },
    };
  }
}
