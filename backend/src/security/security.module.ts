import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmergencyAccessGrant } from './emergency-access-grant.entity';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { AppsModule } from '../apps/apps.module';

@Module({
  imports: [TypeOrmModule.forFeature([EmergencyAccessGrant]), UsersModule, AuditModule, AppsModule],
  controllers: [SecurityController],
  providers: [SecurityService],
  exports: [SecurityService],
})
export class SecurityModule {}
