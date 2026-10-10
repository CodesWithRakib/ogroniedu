import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserEntity } from '../auth/entities/user.entity';
import { RoleEntity } from '../auth/entities/role.entity';
import { UserRoleEntity } from '../auth/entities/user-role.entity';
import { StudentProfileEntity } from '../users/entities/student-profile.entity';
import { GuardianStudentLinkEntity } from './entities/guardian-student-link.entity';
import { GuardiansService } from './guardians.service';
import { GuardiansController } from './guardians.controller';

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
  ],
  controllers: [GuardiansController],
  providers: [GuardiansService],
  exports: [GuardiansService],
})
export class GuardiansModule {}
