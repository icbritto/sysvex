import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class SequenceService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // Incrementa e retorna o próximo valor do contador de forma atômica
  // (INSERT ... ON CONFLICT), seguro mesmo com criações concorrentes.
  async next(key: string): Promise<number> {
    const result = await this.dataSource.query(
      `INSERT INTO sequence_counters (counter_key, value) VALUES ($1, 1)
       ON CONFLICT (counter_key) DO UPDATE SET value = sequence_counters.value + 1
       RETURNING value`,
      [key],
    );
    return result[0].value;
  }
}
