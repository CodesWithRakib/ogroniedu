import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserEntity } from '../auth/entities/user.entity';
import { RoleEntity } from '../auth/entities/role.entity';
import { UserRoleEntity } from '../auth/entities/user-role.entity';
import { StudentProfileEntity } from '../users/entities/student-profile.entity';
import { GuardianStudentLinkEntity } from './entities/guardian-student-link.entity';
import { GuardiansService } from './guardians.service';
import { GuardianProvisioningService } from './services/guardian-provisioning.service';
import { GuardianAccessService } from './guardian-access.service';
import { GuardiansController } from './guardians.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      RoleEntity,
      UserRoleEntity,
      StudentProfileEntity,
      GuardianStudentLinkEntity,
    ]),
    JwtModule.register({}),
    AuditModule,
  ],
  controllers: [GuardiansController],
  providers: [GuardiansService, GuardianProvisioningService, GuardianAccessService],
  exports: [GuardiansService, GuardianProvisioningService, GuardianAccessService],
})
export class GuardiansModule {}
