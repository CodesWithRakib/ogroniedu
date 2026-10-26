import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassroomSessionEntity } from './entities/classroom-session.entity';
import { ClassroomAttendanceRecordEntity } from './entities/classroom-attendance-record.entity';
import { ClassroomConnectionEventEntity } from './entities/classroom-connection-event.entity';
import { BookingSessionEntity } from '../bookings/entities/booking-session.entity';
import { SessionAttendanceEntity } from '../learning/entities/session-attendance.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { ClassroomService } from './services/classroom.service';
import { ClassroomController } from './controllers/classroom.controller';
import { LiveKitMediaProvider } from './providers/livekit-media.provider';
import { MEDIA_PROVIDER } from './constants/classroom.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClassroomSessionEntity,
      ClassroomAttendanceRecordEntity,
      ClassroomConnectionEventEntity,
      BookingSessionEntity,
      SessionAttendanceEntity,
      UserEntity,
    ]),
  ],
  controllers: [ClassroomController],
  providers: [
    ClassroomService,
    {
      provide: MEDIA_PROVIDER,
      useClass: LiveKitMediaProvider,
    },
  ],
  exports: [ClassroomService, MEDIA_PROVIDER],
})
export class ClassroomModule {}
