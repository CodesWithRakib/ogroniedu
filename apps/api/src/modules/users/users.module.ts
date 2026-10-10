import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserEntity } from '../auth/entities/user.entity';
import { StudentProfileEntity } from './entities/student-profile.entity';
import { AuthSessionEntity } from '../auth/entities/auth-session.entity';
import { GuardianStudentLinkEntity } from '../guardians/entities/guardian-student-link.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      StudentProfileEntity,
      AuthSessionEntity,
      GuardianStudentLinkEntity,
      BookingEntity,
    ]),
    JwtModule.register({}),
    forwardRef(() => AuditModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
