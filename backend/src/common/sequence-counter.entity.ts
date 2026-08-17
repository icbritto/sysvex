import { Column, Entity, PrimaryColumn } from 'typeorm';

// Contador atômico usado para gerar números sequenciais pequenos (pedidos
// de venda, de compra, etc.), em vez de timestamps.
@Entity('sequence_counters')
export class SequenceCounter {
  @PrimaryColumn({ name: 'counter_key' })
  counterKey: string;

  @Column({ default: 0 })
  value: number;
}
