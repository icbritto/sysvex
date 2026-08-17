import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Partner } from '../partners/partner.entity';
import { SalesOrderItem } from './sales-order-item.entity';
import { DecimalTransformer } from '../common/transformers/decimal.transformer';
import { PaymentMethod } from '../common/payment-method.enum';

export enum SalesOrderStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
}

@Entity('sales_orders')
export class SalesOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_number' })
  orderNumber: string;

  @ManyToOne(() => Partner, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Partner;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ name: 'order_date', type: 'date' })
  orderDate: string;

  @Column({ type: 'enum', enum: SalesOrderStatus, default: SalesOrderStatus.DRAFT })
  status: SalesOrderStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    name: 'payment_method',
    default: PaymentMethod.PIX,
  })
  paymentMethod: PaymentMethod;

  @OneToMany(() => SalesOrderItem, (item) => item.salesOrder, { cascade: true, eager: true })
  items: SalesOrderItem[];

  @Column('numeric', { precision: 14, scale: 2, name: 'total_amount', default: 0, transformer: DecimalTransformer })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    name: 'delivery_status',
    default: DeliveryStatus.PENDING,
  })
  deliveryStatus: DeliveryStatus;

  @Column({ name: 'shipped_at', type: 'timestamp', nullable: true })
  shippedAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'delivery_notes', type: 'text', nullable: true })
  deliveryNotes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
