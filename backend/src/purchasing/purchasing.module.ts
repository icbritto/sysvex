import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { PurchasingService } from './purchasing.service';
import { PurchasingController } from './purchasing.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { FinanceModule } from '../finance/finance.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseOrder, PurchaseOrderItem]),
    InventoryModule,
    FinanceModule,
    AuditModule,
  ],
  controllers: [PurchasingController],
  providers: [PurchasingService],
})
export class PurchasingModule {}
