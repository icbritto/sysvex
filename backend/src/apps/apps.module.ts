import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { App } from './app.entity';
import { AppsService } from './apps.service';
import { AppsController } from './apps.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([App]), AuditModule],
  controllers: [AppsController],
  providers: [AppsService],
  exports: [AppsService],
})
export class AppsModule {}
