import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SequenceCounter } from './sequence-counter.entity';
import { SequenceService } from './sequence.service';

@Module({
  imports: [TypeOrmModule.forFeature([SequenceCounter])],
  providers: [SequenceService],
  exports: [SequenceService],
})
export class CommonModule {}
