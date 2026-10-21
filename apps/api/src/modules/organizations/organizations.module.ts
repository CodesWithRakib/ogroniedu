import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  OrganizationEntity,
  OrganizationMemberEntity,
  OrganizationInvitationEntity,
} from './entities';
import { UserEntity } from '../auth/entities/user.entity';
import { AuditModule } from '../audit/audit.module';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { AdminOrganizationsController } from './admin-organizations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationEntity,
      OrganizationMemberEntity,
      OrganizationInvitationEntity,
      UserEntity,
    ]),
    AuditModule,
  ],
  providers: [OrganizationsService],
  controllers: [OrganizationsController, AdminOrganizationsController],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
